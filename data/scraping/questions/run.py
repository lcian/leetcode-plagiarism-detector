import csv
import json
import logging
import os
import sys
import tempfile
from typing import List

import boto3
from api_client import Client
from api_client.api.question_controller import edit_question
from api_client.models.contest import Contest
from api_client.models.question import Question
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


def handler(event, context):
    contest_slug = os.getenv("CONTEST_SLUG")
    question_names = os.getenv("QUESTION_NAMES")
    if not (contest_slug and question_names):
        logger.warn(
            "Could not find environment variables CONTEST_SLUG and QUESTION_NAMES, reading them from the SQS queue"
        )
    else:
        process_questions(contest_slug, question_names.split(";"))
        return {}

    queue_name = os.getenv("QUEUE_NAME")
    if not queue_name:
        logger.error("Could not find environment variable QUEUE_NAME")
        return {}
    account = boto3.client("sts").get_caller_identity().get("Account")
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")
    sqs = boto3.client("sqs")
    queue_url = f"https://sqs.{region}.amazonaws.com/{account}/{queue_name}"
    response = sqs.receive_message(QueueUrl=queue_url)
    if "Messages" not in response:
        logger.error("Could not find any message in the queue")
        return {}
    messages = response["Messages"]
    for message in messages:
        body = json.loads(message["Body"])
        contest_slug = body["contest-slug"]
        question_names = body["question_names"]
        process_questions(contest_slug, question_names)
        logger.info(f"Deleting message {message}")
        receipt_handle = message["ReceiptHandle"]
        sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=receipt_handle)
    return {}


if __name__ == "__main__":
    handler({}, None)
