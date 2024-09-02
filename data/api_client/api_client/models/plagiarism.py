from typing import Any, Dict, Type, TypeVar, Tuple, Optional, BinaryIO, TextIO, TYPE_CHECKING

from typing import List


from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast, List
from typing import Dict
from ..types import UNSET, Unset
from typing import cast
from typing import Union

if TYPE_CHECKING:
  from ..models.submission import Submission





T = TypeVar("T", bound="Plagiarism")


@_attrs_define
class Plagiarism:
    """ 
        Attributes:
            submissions (List['Submission']):
            id (Union[Unset, int]):
            confidence_percentage (Union[Unset, int]):
            language (Union[Unset, str]):
            detector_run_id (Union[Unset, int]):
     """

    submissions: List['Submission']
    id: Union[Unset, int] = UNSET
    confidence_percentage: Union[Unset, int] = UNSET
    language: Union[Unset, str] = UNSET
    detector_run_id: Union[Unset, int] = UNSET
    additional_properties: Dict[str, Any] = _attrs_field(init=False, factory=dict)


    def to_dict(self) -> Dict[str, Any]:
        from ..models.submission import Submission
        submissions = []
        for submissions_item_data in self.submissions:
            submissions_item = submissions_item_data.to_dict()
            submissions.append(submissions_item)



        id = self.id

        confidence_percentage = self.confidence_percentage

        language = self.language

        detector_run_id = self.detector_run_id


        field_dict: Dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "submissions": submissions,
        })
        if id is not UNSET:
            field_dict["id"] = id
        if confidence_percentage is not UNSET:
            field_dict["confidencePercentage"] = confidence_percentage
        if language is not UNSET:
            field_dict["language"] = language
        if detector_run_id is not UNSET:
            field_dict["detectorRunId"] = detector_run_id

        return field_dict



    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.submission import Submission
        d = src_dict.copy()
        submissions = []
        _submissions = d.pop("submissions")
        for submissions_item_data in (_submissions):
            submissions_item = Submission.from_dict(submissions_item_data)



            submissions.append(submissions_item)


        id = d.pop("id", UNSET)

        confidence_percentage = d.pop("confidencePercentage", UNSET)

        language = d.pop("language", UNSET)

        detector_run_id = d.pop("detectorRunId", UNSET)

        plagiarism = cls(
            submissions=submissions,
            id=id,
            confidence_percentage=confidence_percentage,
            language=language,
            detector_run_id=detector_run_id,
        )


        plagiarism.additional_properties = d
        return plagiarism

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
