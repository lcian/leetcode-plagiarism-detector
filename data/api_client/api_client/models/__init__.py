""" Contains all the data models used in inputs/outputs """

from .contest import Contest
from .detector_run import DetectorRun
from .detector_run_dto import DetectorRunDTO
from .plagiarism import Plagiarism
from .plagiarism_dto import PlagiarismDTO
from .plagiarism_metadata_dto import PlagiarismMetadataDTO
from .question import Question
from .question_dto import QuestionDTO
from .submission import Submission
from .submission_dto import SubmissionDTO

__all__ = (
    "Contest",
    "DetectorRun",
    "DetectorRunDTO",
    "Plagiarism",
    "PlagiarismDTO",
    "PlagiarismMetadataDTO",
    "Question",
    "QuestionDTO",
    "Submission",
    "SubmissionDTO",
)
