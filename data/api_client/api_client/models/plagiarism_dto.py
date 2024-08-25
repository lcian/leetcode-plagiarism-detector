from typing import Any, Dict, Type, TypeVar, Tuple, Optional, BinaryIO, TextIO, TYPE_CHECKING

from typing import List


from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import Union
from typing import cast, List






T = TypeVar("T", bound="PlagiarismDTO")


@_attrs_define
class PlagiarismDTO:
    """ 
        Attributes:
            confidence_percentage (int):
            submission_ids (List[int]):
            detector_run_id (int):
            language (str):
            id (Union[Unset, int]):
     """

    confidence_percentage: int
    submission_ids: List[int]
    detector_run_id: int
    language: str
    id: Union[Unset, int] = UNSET
    additional_properties: Dict[str, Any] = _attrs_field(init=False, factory=dict)


    def to_dict(self) -> Dict[str, Any]:
        confidence_percentage = self.confidence_percentage

        submission_ids = self.submission_ids



        detector_run_id = self.detector_run_id

        language = self.language

        id = self.id


        field_dict: Dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "confidencePercentage": confidence_percentage,
            "submissionIds": submission_ids,
            "detectorRunId": detector_run_id,
            "language": language,
        })
        if id is not UNSET:
            field_dict["id"] = id

        return field_dict



    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        confidence_percentage = d.pop("confidencePercentage")

        submission_ids = cast(List[int], d.pop("submissionIds"))


        detector_run_id = d.pop("detectorRunId")

        language = d.pop("language")

        id = d.pop("id", UNSET)

        plagiarism_dto = cls(
            confidence_percentage=confidence_percentage,
            submission_ids=submission_ids,
            detector_run_id=detector_run_id,
            language=language,
            id=id,
        )


        plagiarism_dto.additional_properties = d
        return plagiarism_dto

    @property
    def additional_keys(self) -> List[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
