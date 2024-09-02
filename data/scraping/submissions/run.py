import concurrent.futures
import csv
import json
import logging
import os
import sys
import urllib.request
from random import randint
from threading import Event, Thread
from time import sleep
from typing import List, Tuple

import boto3
from api_client import Client
from api_client.api.contest_controller import add_contest
from api_client.api.question_controller import add_question
from api_client.api.submission_controller import add_submissions
from api_client.models.contest import Contest
from api_client.models.question import Question
from api_client.models.question_dto import QuestionDTO
from api_client.models.submission import Submission
from api_client.models.submission_dto import SubmissionDTO
from api_client.types import Response
from dotenv import load_dotenv
from random_user_agent.params import OperatingSystem, SoftwareName
from random_user_agent.user_agent import UserAgent

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraping/submissions")
logger.setLevel(os.getenv("LOG_LEVEL") or logging.INFO)


CONTEST_BASE_URL = "https://leetcode.com/contest"
CONTEST_API_URL = "https://leetcode.com/contest/api/ranking"
SUBMISSIONS_API_URL = "https://leetcode.com/api/submissions"
HEADERS = {
    "accept": "application/json, text/javascript, */*; q=0.01",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-requested-with": "XMLHttpRequest",
    "referer": "https://leetcode.com/contest",
}

PAGE_LIMIT = int(os.getenv("PAGE_LIMIT") or 100)
NUM_WORKERS = 10
MAX_RETRIES = 50
REQUEST_TIMEOUT_SEC = 15

OXYLABS_CREDENTIALS = os.getenv("OXYLABS_CREDENTIALS")
USER_AGENT_ROTATOR = UserAgent(
    software_names=[SoftwareName.CHROME.value, SoftwareName.FIREFOX.value],
    operating_systems=[OperatingSystem.WINDOWS.value, OperatingSystem.MACOS.value],
    limit=200,
)

API_CLIENT = None
if os.getenv("API_BASE_URL"):
    API_CLIENT = Client(base_url=str(os.getenv("API_BASE_URL")))


def get(url: str, headers_override=None) -> dict:
    headers_override = headers_override or {}
    headers = HEADERS.copy()
    for k in headers_override:
        headers[k] = headers_override[k]
    delay = 1
    for i in range(MAX_RETRIES):
        try:
            headers["user-agent"] = USER_AGENT_ROTATOR.get_random_user_agent()
            if not OXYLABS_CREDENTIALS:
                request = urllib.request.Request(url, headers=headers)
                response = urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SEC)
                return json.loads(response.read().decode())
            else:
                proxy_url = f"http://customer-{OXYLABS_CREDENTIALS}@pr.oxylabs.io:7777"
                proxy = urllib.request.ProxyHandler(
                    {
                        "http": proxy_url,
                        "https": proxy_url,
                    }
                )
                opener = urllib.request.build_opener(proxy)
                request = urllib.request.Request(url, headers=headers)
                response = opener.open(request, timeout=REQUEST_TIMEOUT_SEC)
                return json.loads(response.read().decode())
        except Exception as _:
            logger.error(f"Failed to fetch {url} (try {i})")
            sleep(randint(1, delay))
            delay = min(delay * 2, 30)  # exponential backoff
    logger.error(f"Something went wrong, could not fetch {url} for {MAX_RETRIES} times, exiting")
    sys.exit(1)


def get_questions(contest_slug: str) -> List[QuestionDTO]:
    response = get(
        f"{CONTEST_API_URL}/{contest_slug}/?pagination=1&region=global",
        {"Referer": f"{CONTEST_BASE_URL}/{contest_slug}/ranking/1/"},
    )
    questions = []
    for i, question in enumerate(response["questions"]):
        questions.append(
            QuestionDTO(
                id=int(question["question_id"]),
                name=question["title"],
                number_in_contest=i + 1,
                contest_slug=contest_slug,
                # cannot get this here
                number=0,
                description="",
            )
        )
    return questions


def get_submissions(contest_slug: str, page: int) -> dict:
    return get(
        f"{CONTEST_API_URL}/{contest_slug}/?pagination={page}&region=global",
        {"Referer": f"{CONTEST_BASE_URL}/{contest_slug}/ranking/{page}/"},
    )


def get_submission_with_code(submission_id: str, contest_slug: str, page: int) -> dict:
    return get(
        f"{SUBMISSIONS_API_URL}/{submission_id}",
        {"Referer": f"{CONTEST_BASE_URL}/{contest_slug}/ranking/{page}/"},
    )


def save_api(contest: Contest, questions: List[QuestionDTO], submissions: List[SubmissionDTO]):
    assert API_CLIENT, "API_CLIENT should be set"
    logger.info("Creating contest")
    add_contest.sync_detailed(client=API_CLIENT, contest=contest)
    logger.info("Creating questions")
    for question in questions:
        add_question.sync_detailed(client=API_CLIENT, body=question)
    logger.info("Creating submissions")
    add_submissions.sync_detailed(client=API_CLIENT, body=submissions)


def save_local(submissions: List[SubmissionDTO]):
    logger.info("Saving result locally")
    with open("submissions.csv", "w") as file:
        submission = submissions[0]
        header = submission.to_dict().keys()
        csv.writer(file).writerow(header)
        csv.writer(file).writerows([submission.to_dict().values() for submission in submissions])


def get_all_submissions(contest_slug: str, lookup_questions: List[QuestionDTO]) -> Tuple[Contest, List[SubmissionDTO]]:
    logger.info(f"Fetching submissions for contest {contest_slug}")
    lookup_question_ids = [question.id for question in lookup_questions]
    contest = None
    submissions: List[SubmissionDTO] = []
    i = 1
    while True:
        response = get_submissions(contest_slug, i)
        if i == PAGE_LIMIT or not response["submissions"]:  # pages are over
            break
        logger.info(f"Processing page {i}")
        page_submissions = []
        count = 0
        for user_submissions, user in zip(response["submissions"], response["total_rank"]):
            for question_id in user_submissions:
                if int(question_id) not in lookup_question_ids:
                    continue
                count += 1
                if user_submissions[question_id]["data_region"] == "CN":
                    continue
                if not contest:
                    contest = Contest(id=user["contest_id"], slug=contest_slug)
                user_submissions[question_id]["userSlug"] = user["user_slug"]
                user_submissions[question_id]["page"] = i
                user_submissions[question_id]["questionId"] = int(question_id)
                page_submissions.append(user_submissions[question_id])
        # 0 submissions for the problems we are interested in (in practice, Q3 and Q4 -- hence, we can stop here)
        if count == 0:
            logger.info("No more submissions for the questions we are interested in, stopping")
            break
        with concurrent.futures.ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
            for submission, code in zip(
                page_submissions,
                executor.map(
                    lambda id: get_submission_with_code(id, contest_slug, i),
                    [sub["submission_id"] for sub in page_submissions],
                ),
            ):
                if code:
                    submission["language"] = code["lang"]
                    submission["code"] = code["code"]
                    submission["page"] = i
                    submissions.append(SubmissionDTO.from_dict(submission))
        logger.info(f"Fetched {len(page_submissions)} submissions from page {i}")
        i += 1
    assert contest
    return (contest, submissions)


def process_contest(contest_slug: str) -> List[str]:
    logger.info(f"Processing contest {contest_slug}")
    questions = get_questions(contest_slug)
    questions = questions[2:]
    contest, submissions = get_all_submissions(contest_slug, questions)
    logger.info(f"Saving {len(submissions)} submissions")
    if API_CLIENT:
        save_api(contest, questions, submissions)
    else:
        save_local(submissions)
    return [question.name for question in questions]


def setup_heartbeat():
    stopped = Event()

    def loop():
        while not stopped.wait(60):
            client = boto3.client("stepfunctions")
            client.send_task_heartbeat(
                taskToken=os.environ["TASK_TOKEN"],
            )

    Thread(target=loop, daemon=True).start()
    return stopped.set


def handler(event, context):
    contest_slug = os.environ["CONTEST_SLUG"]
    if os.environ.get("TASK_TOKEN"):
        setup_heartbeat()
    question_names = process_contest(contest_slug)
    if os.environ.get("TASK_TOKEN"):
        result = {
            "contest-slug": contest_slug,
            "question-names": ",".join(question_names),
        }
        client = boto3.client("stepfunctions")
        client.send_task_success(
            taskToken=os.environ["TASK_TOKEN"],
            output=json.dumps(result),
        )


if __name__ == "__main__":
    handler({}, None)
