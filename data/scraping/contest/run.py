import json
import logging
import os
import sys
import urllib.request
from random import randint
from time import sleep

import boto3
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraping/contest")
logger.setLevel(os.getenv("LOG_LEVEL") or logging.INFO)

CONTEST_URL = "https://leetcode.com/contest"
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

MAX_RETRIES = 20
REQUEST_TIMEOUT_SEC = 15
OXYLABS_CREDENTIALS = os.getenv("OXYLABS_CREDENTIALS")


def get(url: str, headers_override=None) -> str:
    delay = 1
    for i in range(MAX_RETRIES):
        try:
            if not OXYLABS_CREDENTIALS:
                request = urllib.request.Request(url, headers=HEADERS)
                response = urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SEC)
                return response.read().decode()
            else:
                proxy_url = f"http://customer-{OXYLABS_CREDENTIALS}@pr.oxylabs.io:7777"
                proxy = urllib.request.ProxyHandler(
                    {
                        "http": proxy_url,
                        "https": proxy_url,
                    }
                )
                opener = urllib.request.build_opener(proxy)
                request = urllib.request.Request(url, headers=HEADERS)
                response = opener.open(request, timeout=REQUEST_TIMEOUT_SEC)
                return response.read().decode()
        except Exception as _:
            logger.error(f"Failed to fetch {url} (try {i})")
            sleep(randint(1, delay))
            delay = min(delay * 2, 30)  # exponential backoff
    logger.error(f"Something went wrong, could not fetch {url} for {MAX_RETRIES} times, exiting")
    sys.exit(1)


def get_latest_contest_slug():
    selector = r"#__next > div.flex.min-h-screen.min-w-\[360px\].flex-col.text-label-1.dark\:text-dark-label-1.bg-layer-bg.dark\:bg-dark-layer-bg > div.mx-auto.w-full.grow.p-0.md\:max-w-none.md\:p-0.lg\:max-w-none.bg-layer-bg.dark\:bg-dark-layer-bg > div > div > div.z-base-3.flex.w-full.flex-col.px-4 > div.lc-xl\:space-x-4.flex.w-full > div.w-full.flex > div > div > div.flex.h-full.flex-1 > div > div.mt-\[11px\].flex.flex-1.flex-col > div > div:nth-child(1) > div > a"
    # request = urllib.request.Request(CONTEST_URL, headers=HEADERS)
    # response = urllib.request.urlopen(request)
    response = get(CONTEST_URL)
    soup = BeautifulSoup(response, "html.parser")
    element = soup.select(selector)
    if not element:
        logger.error("Failed to get latest contest slug: unable to find element")
        sys.exit(2)
    if "data-contest-title-slug" not in element[0].attrs:
        logger.error("Failed to get latest contest slug: slug not in element attributes")
        sys.exit(2)
    return element[0].get("data-contest-title-slug")


def handler(event, context):
    latest_contest_slug = get_latest_contest_slug()

    table_name = os.getenv("PROCESSED_CONTEST_SLUGS_TABLE_NAME")
    if not table_name:
        logger.warn("Could not find environment variable PROCESSED_CONTEST_SLUGS_TABLE_NAME")
        logger.info(f"Latest contest slug: {latest_contest_slug}")
        return {}

    dynamo = boto3.client("dynamodb")
    response = dynamo.get_item(TableName=table_name, Key={"ContestSlug": {"S": latest_contest_slug}})
    if "Item" in response:
        logger.info(f"{latest_contest_slug} already in table.")
        result = {}
    else:
        logger.info(f"{latest_contest_slug} not in table, inserting it")
        dynamo.put_item(TableName=table_name, Item={"ContestSlug": {"S": latest_contest_slug}})
        result = {"contest-slug": latest_contest_slug}

    client = boto3.client("stepfunctions")
    client.send_task_success(
        taskToken=os.environ["TASK_TOKEN"],
        output=json.dumps(result),
    )
    return {}


if __name__ == "__main__":
    handler({}, None)
