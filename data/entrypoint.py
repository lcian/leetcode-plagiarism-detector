import logging
import os
import sys

import processing
import scraping
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("entrypoint")
logger.setLevel(os.getenv("LOG_LEVEL") or logging.INFO)

TASKS = {
    "scraping/contest": scraping.contest.handler,
    "scraping/submissions": scraping.submissions.handler,
    "scraping/questions": scraping.questions.handler,
    "processing/copydetect": processing.copydetect.handler,
}


def main():
    task_name = os.getenv("TASK")
    if not task_name:
        logger.error("Could not find environment variable TASK")
        sys.exit(1)
    task_name = str(task_name)
    if task_name not in TASKS:
        logger.error(f"Invalid task: {task_name}")
    logger.info(f"Running task: {task_name}")
    TASKS[task_name]({}, None)


if __name__ == "__main__":
    main()
