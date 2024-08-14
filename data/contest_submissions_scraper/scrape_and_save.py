import json
import logging
import os
import sys
import urllib.request

import boto3
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

CONTEST_API_URL = "https://leetcode.com/contest/api/ranking"
HEADERS = {
    "accept": "application/json, text/javascript, */*; q=0.01",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    "sec-ch-ua-arch": '"x86"',
    "sec-ch-ua-bitness": '"64"',
    "sec-ch-ua-full-version": '"126.0.6478.127"',
    "sec-ch-ua-full-version-list": '"Not/A)Brand";v="8.0.0.0", "Chromium";v="126.0.6478.127", "Google Chrome";v="126.0.6478.127"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": '""',
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-ua-platform-version": '"15.0.0"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "x-requested-with": "XMLHttpRequest",
    "referer": "https://leetcode.com/contest",
}


def get_question_description(id):
    pass


def get_questions(contest_slug):
    return []


def get_submissions(contest_slug):
    pass


def process_contest(contest_slug):
    submissions = get_submissions(contest_slug)
    questions = get_questions(contest_slug)
    descriptions = [get_question_description(q) for q in questions]


def handler(event, context):
    contest_slug = os.getenv("CONTEST_SLUG")
    if contest_slug:
        logger.info(
            "Found environment variable CONTEST_SLUG, processing contest directly"
        )
        process_contest(contest_slug)
        return {}
    logger.info(
        "Could not find environment variable CONTEST_SLUG, reading it from the SQS queue"
    )

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
        logger.error(
            "Could not find environment variable AWS_REGION or AWS_DEFAULT_REGION"
        )
        return {}
    sqs = boto3.client("sqs")

    queue_url = f"https://sqs.{region}.amazonaws.com/{account}/{queue_name}"
    response = sqs.receive_message(QueueUrl=queue_url)
    if "Messages" not in response:
        logger.error("Could not find any message in the queue")
        return {}
    messages = response["Messages"]
    for message in messages:
        body = json.loads(message["Body"])
        if "contest-slug" not in body:
            logger.error(f'Malformed message {body}, could not find key "contest-slug"')
            return {}
        contest_slug = body["contest-slug"]
        process_contest(contest_slug)
        receipt_handle = message["ReceiptHandle"]
        sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=receipt_handle)
    return {}


if __name__ == "__main__":
    handler({}, None)
