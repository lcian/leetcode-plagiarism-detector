from typing import Any, Dict, Type, TypeVar, Tuple, Optional, BinaryIO, TextIO, TYPE_CHECKING

from typing import List


from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import Union
from ..types import UNSET, Unset






T = TypeVar("T", bound="DetectorRunDTO")


@_attrs_define
class DetectorRunDTO:
    """ 
        Attributes:
            detector (str):
            parameters (str):
            question_id (int):
            id (Union[Unset, int]):
            reference_submission_id (Union[Unset, int]):
     """

    detector: str
    parameters: str
    question_id: int
    id: Union[Unset, int] = UNSET
    reference_submission_id: Union[Unset, int] = UNSET
    additional_properties: Dict[str, Any] = _attrs_field(init=False, factory=dict)


    def to_dict(self) -> Dict[str, Any]:
        detector = self.detector

        parameters = self.parameters

        question_id = self.question_id

        id = self.id

        reference_submission_id = self.reference_submission_id


        field_dict: Dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "detector": detector,
            "parameters": parameters,
            "questionId": question_id,
        })
        if id is not UNSET:
            field_dict["id"] = id
        if reference_submission_id is not UNSET:
            field_dict["referenceSubmissionId"] = reference_submission_id

        return field_dict



    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        detector = d.pop("detector")

        parameters = d.pop("parameters")

        question_id = d.pop("questionId")

        id = d.pop("id", UNSET)

        reference_submission_id = d.pop("referenceSubmissionId", UNSET)

        detector_run_dto = cls(
            detector=detector,
            parameters=parameters,
            question_id=question_id,
            id=id,
            reference_submission_id=reference_submission_id,
        )


        detector_run_dto.additional_properties = d
        return detector_run_dto

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
