import csv
import json
import logging
import os
import sys
import tempfile
from threading import Event, Thread
from typing import List

import boto3
from api_client import Client
from api_client.api.question_controller import edit_question
from api_client.models.question_dto import QuestionDTO
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraping/questions")
logger.setLevel(os.getenv("LOG_LEVEL") or logging.INFO)

REPO = "https://github.com/doocs/leetcode.git"
DESCRIPTION_TAGS = ["<!-- description:start -->", "<!-- description:end -->"]

API_CLIENT = None
if os.getenv("API_BASE_URL"):
    API_CLIENT = Client(base_url=str(os.getenv("API_BASE_URL")))


def save_api(questions: List[QuestionDTO]):
    assert API_CLIENT, "API_CLIENT should be initialized"
    logger.info("Saving result using API")
    for question in questions:
        edit_question.sync_detailed(client=API_CLIENT, body=question)


def save_local(questions: List[QuestionDTO]):
    logger.info("Saving result locally")
    with open("submissions.csv", "w") as file:
        question = questions[0]
        header = question.to_dict().keys()
        csv.writer(file).writerow(header)
        csv.writer(file).writerows([question.to_dict().values() for question in questions])


def process_questions(contest_slug, question_names):
    questions = []
    logger.info(f"Processing contest {contest_slug}, questions {question_names}")

    cwd = os.getcwd()
    with tempfile.TemporaryDirectory() as tmpdir:
        os.chdir(tmpdir)
        os.system(f"git clone {REPO} --depth=1")
        for dirpath, _, _ in os.walk("./leetcode/solution"):
            if dirpath.count("/") != 4:
                continue
            _, _, _, _, question = dirpath.split("/", 4)
            question_num, question_name = question.split(".", 2)
            if question_name in question_names:
                with open(os.path.join(dirpath, "README_EN.md"), "r") as description_file:
                    description_html = (
                        description_file.read().split(DESCRIPTION_TAGS[0], 2)[1].split(DESCRIPTION_TAGS[1], 2)[0]
                    )
                    soup = BeautifulSoup(description_html, "html.parser")
                    questions.append(
                        QuestionDTO(
                            number=int(question_num),
                            number_in_contest=2 + question_names.index(question_name) + 1,
                            name=question_name,
                            description=soup.get_text().strip(),
                            contest_slug=contest_slug,
                        )
                    )
    os.chdir(cwd)
    if len(questions) != len(question_names):
        logger.error("Could not find descriptions for all questions")
        sys.exit(0)

    logger.info(f"Saving {len(questions)} questions")
    if API_CLIENT:
        save_api(questions)
    else:
        save_local(questions)

    processing_queue_name = os.getenv("PROCESSING_QUEUE_NAME")
    if not processing_queue_name:
        logger.warn("Could not find environment variable PROCESSING_QUEUE_NAME")
        return
    account = boto3.client("sts").get_caller_identity().get("Account")
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")
    sqs = boto3.client("sqs")
    queue_url = f"https://sqs.{region}.amazonaws.com/{account}/{processing_queue_name}"
    sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(
            {
                "contest-slug": contest_slug,
            }
        ),
    )
    logger.info(f"Sent message on queue {processing_queue_name}")


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
    question_names = os.environ["QUESTION_NAMES"]
    if os.environ.get("TASK_TOKEN"):
        setup_heartbeat()
    process_questions(contest_slug, question_names.split(","))
    if os.environ.get("TASK_TOKEN"):
        result = {
            "contest-slug": contest_slug,
        }
        client = boto3.client("stepfunctions")
        client.send_task_success(
            taskToken=os.environ["TASK_TOKEN"],
            output=json.dumps(result),
        )
    return {}


if __name__ == "__main__":
    handler({}, None)
