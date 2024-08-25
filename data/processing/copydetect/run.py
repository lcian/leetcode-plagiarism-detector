import json
import logging
import math
import os
import tempfile
from collections import defaultdict
from types import SimpleNamespace
from typing import List, Optional

import boto3
import copydetect
from api_client import Client
from api_client.api.detector_run_controller import add_detector_run
from api_client.api.plagiarism_controller import add_plagiarisms
from api_client.api.question_controller import get_questions_by_contest
from api_client.api.submission_controller import get_submissions_1
from api_client.models.detector_run import DetectorRun
from api_client.models.detector_run_dto import DetectorRunDTO
from api_client.models.plagiarism_dto import PlagiarismDTO
from api_client.models.question import Question
from api_client.models.submission import Submission
from api_client.types import Response
from dotenv import load_dotenv
from processing.utils import UnionFind

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("processing/copydetect")
logger.setLevel(os.getenv("LOG_LEVEL") or logging.INFO)

DETECTOR_NAME = "copydetect"
PARAMETERS = SimpleNamespace(**{"GROUP_SIZE_THRESHOLD": 4, "SIMILARITY_THRESHOLD": 0.8})

API_CLIENT = Client(base_url=str(os.getenv("API_BASE_URL")))


def create_detector_run(question: Question, reference_submission_id: Optional[int]) -> DetectorRun:
    assert question.id
    detector_run_dto = DetectorRunDTO(
        detector=DETECTOR_NAME,
        parameters=str(PARAMETERS.__dict__)[1:-1],
        question_id=int(question.id),
    )
    if reference_submission_id:
        detector_run_dto.reference_submission_id = reference_submission_id
    response: Response[DetectorRun] = add_detector_run.sync_detailed(client=API_CLIENT, body=detector_run_dto)
    detector_run = json.loads(response.content.decode())
    return DetectorRun.from_dict(detector_run)


def process_group(
    submissions: List[Submission],
    language: str,
    question: Question,
    detector_run: DetectorRun,
):
    if len(submissions) < PARAMETERS.GROUP_SIZE_THRESHOLD:
        logger.info(
            f"Skipping {question.name} [{language}] ({len(submissions)} < {PARAMETERS.GROUP_SIZE_THRESHOLD} submissions)"
        )
        return
    logger.info(f"Processing {question.name} [{language}] ({len(submissions)} submissions)")
    submissions.sort(key=lambda x: x.date)
    submission_id_to_submission = {submission.id: submission for submission in submissions}
    added_users = set()
    plagiarism_dtos = []
    cwd = os.getcwd()
    with tempfile.TemporaryDirectory() as tmpdir:
        os.chdir(tmpdir)
        for submission in submissions:
            if submission.user_slug not in added_users:
                with open(f"{submission.id}.txt", "w") as f:
                    f.write(submission.code)
                added_users.add(submission.user_slug)

        detector = copydetect.CopyDetector(
            test_dirs=[tmpdir],
            extensions=[".txt"],
            force_language=language,
            silent=True,
        )
        detector.run()
        copied = detector.get_copied_code_list()
        copied = [
            (sim1, sim2, file1, file2, _, _, _)
            for sim1, sim2, file1, file2, _, _, _ in copied
            if sim1 > PARAMETERS.SIMILARITY_THRESHOLD and sim2 > PARAMETERS.SIMILARITY_THRESHOLD
        ]
        copied_submissions = [int(file1.split("/")[-1].split(".")[0]) for _, _, file1, file2, _, _, _ in copied] + [
            int(file2.split("/")[-1].split(".")[0]) for _, _, file1, file2, _, _, _ in copied
        ]
        union_find = UnionFind(copied_submissions)
        confidence = defaultdict(lambda: 0)
        for sim1, sim2, file1, file2, _, _, _ in copied:
            sub1 = int(file1.split("/")[-1].split(".")[0])
            sub2 = int(file2.split("/")[-1].split(".")[0])
            confidence[sub1] = max(sim1, confidence[sub1])
            confidence[sub2] = max(sim2, confidence[sub2])
            union_find.unite(sub1, sub2)
        groups = union_find.get_groups()
        logger.info(f"Found {len(groups)} plagiarism groups")
        i = 0
        for reference_submission_id, group in groups.items():
            plagiarism_submissions = [submission_id_to_submission[submission_id] for submission_id in group]
            if len(group) < PARAMETERS.GROUP_SIZE_THRESHOLD:
                logger.info(f"Skipping group {i} ({len(group)} < {PARAMETERS.GROUP_SIZE_THRESHOLD} submissions)")
                i += 1
                continue
            logger.info(f"Adding group {i} ({len(group)} submissions)")
            plagiarism_dtos.append(
                PlagiarismDTO(
                    confidence_percentage=int(
                        min([confidence[submission.id] for submission in plagiarism_submissions]) * 100
                    ),
                    submission_ids=[submission.id for submission in plagiarism_submissions],
                    detector_run_id=int(detector_run.id or -1),
                    language=language,
                ),
            )
            i += 1
    add_plagiarisms.sync_detailed(client=API_CLIENT, body=plagiarism_dtos)
    os.chdir(cwd)


def process_question(question: Question, submissions: List[Submission]):
    logger.info(f"Processing question {question.name}")
    lang_submissions = defaultdict(list)
    for submission in submissions:
        lang_submissions[submission.language].append(submission)
    detector_run = create_detector_run(question, None)
    for lang in lang_submissions:
        process_group(lang_submissions[lang], lang, question, detector_run)


def process_contest(contest_slug: str):
    logger.info(f"Processing contest {contest_slug}")
    questions_response: Response[List[Question]] = get_questions_by_contest.sync_detailed(
        client=API_CLIENT, contest_slug=contest_slug
    )
    questions = json.loads(questions_response.content.decode())
    questions = [Question.from_dict(question) for question in questions]
    for question in questions:
        assert question.id, "Fetched question must have an id"
        submissions_response: Response[List[Submission]] = get_submissions_1.sync_detailed(
            client=API_CLIENT, question_id=question.id
        )
        submissions = json.loads(submissions_response.content.decode())
        submissions = [Submission.from_dict(submission) for submission in submissions]
        print(question)
        print(len(submissions))
        process_question(question, submissions)


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
        process_contest(contest_slug)
        logger.info(f"Deleting message {message}")
        receipt_handle = message["ReceiptHandle"]
        sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=receipt_handle)
    return {}


if __name__ == "__main__":
    handler({}, None)
