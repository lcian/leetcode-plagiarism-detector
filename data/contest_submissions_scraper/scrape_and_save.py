import concurrent.futures
import json
import logging
import os
import urllib.request

import awswrangler as wr
import boto3
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("contest_submissions_scraper")
logger.setLevel(logging.DEBUG)

NUM_WORKERS = 10

CONTEST_API_URL = "https://leetcode.com/contest/api/ranking"
SUBMISSIONS_API_URL = "https://leetcode.com/api/submissions"
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


def get_questions(contest_slug):
    request = urllib.request.Request(
        f"{CONTEST_API_URL}/{contest_slug}?pagination=0&region=global",
        headers=HEADERS,
    )
    response = urllib.request.urlopen(request)
    response = json.loads(response.read().decode())
    return response["questions"]


def get_submission_with_code(submission_id):
    try:
        request = urllib.request.Request(
            f"{SUBMISSIONS_API_URL}/{submission_id}",
            headers=HEADERS,
        )
        response = urllib.request.urlopen(request)
        response = json.loads(response.read().decode())
    except Exception as e:
        logger.error(f"Failed to fetch submission {submission_id}", exc_info=e)
        return {}
    return response


def save_s3(df: pd.DataFrame, contest_slug: str, bucket_name: str):
    s3_path = f"s3://{bucket_name}/{contest_slug}/submissions/"
    logger.info(f"Saving result to {s3_path}")
    wr.s3.to_parquet(df=df, path=s3_path, dataset=True, index=False)


def save_local(df: pd.DataFrame):
    logger.info("Saving result to submissions.csv")
    df.to_csv("submissions.csv", index=False)


def get_submissions(contest_slug: str) -> pd.DataFrame:
    logger.info(f"Fetching submissions for contest {contest_slug}")
    submissions = []
    i = 0
    while True:
        request = urllib.request.Request(
            f"{CONTEST_API_URL}/{contest_slug}?pagination={i}&region=global",
            headers=HEADERS,
        )
        try:
            response = urllib.request.urlopen(request)
        except Exception as e:
            logger.error(f"Failed to fetch page {i}", exc_info=e)
            i += 1
            continue
        response = json.loads(response.read().decode())
        if not response["submissions"]:  # empty submissions = pages are over
            break
        logger.info(f"Processing page {i}")
        page_submissions = sum(  # flatten
            [
                list(user_submissions.values())  # grab the submissions
                for user_submissions in response["submissions"]  # array of dicts { question_id: submission }
            ],  # type: ignore
            [],
        )
        page_submissions = [
            submission for submission in page_submissions if submission["data_region"] != "CN"
        ]  # only leetcode.com from this endpoint
        with concurrent.futures.ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
            for submission, code in zip(
                page_submissions,
                executor.map(
                    get_submission_with_code,
                    [sub["submission_id"] for sub in page_submissions],
                ),
            ):
                if code:
                    submission["lang"] = code["lang"]
                    submission["code"] = code["code"]
                    submissions.append(submission)
        i += 1
    return pd.DataFrame(submissions)


def process_contest(contest_slug: str):
    logger.info(f"Processing contest {contest_slug}")
    submissions = get_submissions(contest_slug)
    bucket = os.getenv("CONTEST_SUBMISSIONS_BUCKET_NAME")
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
