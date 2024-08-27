from typing import Any, Dict, Type, TypeVar, Tuple, Optional, BinaryIO, TextIO, TYPE_CHECKING

from typing import List


from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import Union
from ..types import UNSET, Unset






T = TypeVar("T", bound="DetectorRun")


@_attrs_define
class DetectorRun:
    """ 
        Attributes:
            id (Union[Unset, int]):
            detector (Union[Unset, str]):
            parameters (Union[Unset, str]):
            reference_submission_id (Union[Unset, int]):
            question_id (Union[Unset, int]):
     """

    id: Union[Unset, int] = UNSET
    detector: Union[Unset, str] = UNSET
    parameters: Union[Unset, str] = UNSET
    reference_submission_id: Union[Unset, int] = UNSET
    question_id: Union[Unset, int] = UNSET
    additional_properties: Dict[str, Any] = _attrs_field(init=False, factory=dict)


    def to_dict(self) -> Dict[str, Any]:
        id = self.id

        detector = self.detector

        parameters = self.parameters

        reference_submission_id = self.reference_submission_id

        question_id = self.question_id


        field_dict: Dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if id is not UNSET:
            field_dict["id"] = id
        if detector is not UNSET:
            field_dict["detector"] = detector
        if parameters is not UNSET:
            field_dict["parameters"] = parameters
        if reference_submission_id is not UNSET:
            field_dict["referenceSubmissionId"] = reference_submission_id
        if question_id is not UNSET:
            field_dict["questionId"] = question_id

        return field_dict



    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        id = d.pop("id", UNSET)

        detector = d.pop("detector", UNSET)

        parameters = d.pop("parameters", UNSET)

        reference_submission_id = d.pop("referenceSubmissionId", UNSET)

        question_id = d.pop("questionId", UNSET)

        detector_run = cls(
            id=id,
            detector=detector,
            parameters=parameters,
            reference_submission_id=reference_submission_id,
            question_id=question_id,
        )


        detector_run.additional_properties = d
        return detector_run

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
