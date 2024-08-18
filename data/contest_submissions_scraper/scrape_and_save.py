import concurrent.futures
import json
import logging
import math
import os
import sys
import urllib.request
from time import sleep
from typing import List

import awswrangler as wr
import boto3
import pandas as pd
from random_user_agent.params import OperatingSystem, SoftwareName
from random_user_agent.user_agent import UserAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("contest_submissions_scraper")
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

NUM_WORKERS = 10
PAGE_LIMIT = os.getenv("PAGE_LIMIT") or math.inf
MAX_RETRIES = 10
REQUEST_TIMEOUT_SEC = 15

OXYLABS_CREDENTIALS = os.getenv("OXYLABS_CREDENTIALS")

_browsers = [SoftwareName.CHROME.value]
_oss = [OperatingSystem.WINDOWS.value]
USER_AGENT_ROTATOR = UserAgent(software_names=_browsers, operating_systems=_oss, limit=100)


def get(url, headers_override=None) -> dict:
    headers_override = headers_override or {}
    headers = HEADERS.copy()
    for k in headers_override:
        headers[k] = headers_override[k]
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
        except Exception as e:
            logger.error(f"Failed to fetch {url} (try {i})")
            sleep(1)
    logger.error(f"Something went wrong, could not fetch {url} for {MAX_RETRIES} times, exiting")
    sys.exit(1)


def get_questions(contest_slug):
    response = get(
        f"{CONTEST_API_URL}/{contest_slug}/?pagination=1&region=global",
        {"Referer": f"{CONTEST_BASE_URL}/{contest_slug}/ranking/1/"},
    )
    return response["questions"]


def get_submissions(contest_slug, page):
    return get(
        f"{CONTEST_API_URL}/{contest_slug}/?pagination={page}&region=global",
        {"Referer": f"{CONTEST_BASE_URL}/{contest_slug}/ranking/{page}/"},
    )


def get_submission_with_code(submission_id, contest_slug, page):
    return get(
        f"{SUBMISSIONS_API_URL}/{submission_id}",
        {"Referer": f"{CONTEST_BASE_URL}/{contest_slug}/ranking/{page}/"},
    )


def save_s3(df: pd.DataFrame, contest_slug: str, bucket_name: str):
    s3_path = f"s3://{bucket_name}/{contest_slug}/submissions/"
    logger.info(f"Saving result to {s3_path}")
    wr.s3.to_parquet(df=df, path=s3_path, dataset=True, index=False)


def save_local(df: pd.DataFrame):
    logger.info("Saving result to submissions.csv")
    df.to_csv("submissions.csv", index=False)


def get_all_submissions(contest_slug: str, question_ids: List[str]) -> pd.DataFrame:
    logger.info(f"Fetching submissions for contest {contest_slug}")
    submissions = []
    i = 1
    while True:
        response = get_submissions(contest_slug, i)
        if i == PAGE_LIMIT or not response["submissions"]:  # pages are over
            break
        logger.info(f"Processing page {i}")
        page_submissions = []
        count = 0
        for user_submissions in response["submissions"]:
            for question_id in user_submissions:
                if int(question_id) not in question_ids:
                    continue
                count += 1
                if user_submissions[question_id]["data_region"] == "CN":
                    continue
                page_submissions.append(user_submissions[question_id])
        # 0 submissions for the problems we are interested in (in practice, Q3 and Q4, hence we can stop here)
        if count == 0:
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
                    submission["lang"] = code["lang"]
                    submission["code"] = code["code"]
                    submissions.append(submission)
        logger.info(f"Fetched {len(page_submissions)} submissions from page {i}")
        i += 1
    return pd.DataFrame(submissions)


def process_contest(contest_slug: str):
    logger.info(f"Processing contest {contest_slug}")
    questions = get_questions(contest_slug)
    question_ids = [question["question_id"] for question in questions]
    question_ids.sort(key=lambda x: int(x))
    question_ids = question_ids[2:]
    submissions = get_all_submissions(contest_slug, question_ids)
    bucket = os.getenv("CONTEST_SUBMISSIONS_BUCKET_NAME")
    logger.info(f"Saving {len(submissions)} records")
    if bucket:
        save_s3(submissions, contest_slug, bucket)
    else:
        logger.info("Could not find environment variable CONTEST_SUBMISSIONS_BUCKET_NAME")
        save_local(submissions)


def handler(event, context):
    contest_slug = os.getenv("CONTEST_SLUG")
    if contest_slug:
        logger.info("Found environment variable CONTEST_SLUG, processing contest directly")
        process_contest(contest_slug)
        return {}
    logger.info("Could not find environment variable CONTEST_SLUG, reading it from the SQS queue")

    queue_name = os.getenv("QUEUE_NAME")
    if not queue_name:
        logger.error("Could not find environment variable QUEUE_NAME")
        return {}
    try:
        account = boto3.client("sts").get_caller_identity().get("Account")
    except Exception as e:
        logger.error("Failed to get account ID via STS", exc_info=e)
        return {}
    region = os.getenv("AWS_REGION")
    if not region:
        region = os.getenv("AWS_DEFAULT_REGION")
    if not region:
        logger.error("Could not find environment variable AWS_REGION or AWS_DEFAULT_REGION")
        return {}
    sqs = boto3.client("sqs")

    queue_url = f"https://sqs.{region}.amazonaws.com/{account}/{queue_name}"
    response = sqs.receive_message(QueueUrl=queue_url)
    if "Messages" not in response:
        logger.error("Could not find any message in the queue")
        return {}
    logger.info(f"Fetched {len(response['Messages'])} messages from the queue")
    messages = response["Messages"]
    for message in messages:
        body = json.loads(message["Body"])
        if "contest-slug" not in body:
            logger.error(f'Malformed message {body}, could not find key "contest-slug"')
            return {}
        contest_slug = body["contest-slug"]
        process_contest(contest_slug)
        logger.info(f"Deleting message {message}")
        receipt_handle = message["ReceiptHandle"]
        sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=receipt_handle)
    return {}


if __name__ == "__main__":
    handler({}, None)
