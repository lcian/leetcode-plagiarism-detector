from typing import Any, Dict, Type, TypeVar, Tuple, Optional, BinaryIO, TextIO, TYPE_CHECKING

from typing import List


from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="PlagiarismMetadataDTO")


@_attrs_define
class PlagiarismMetadataDTO:
    """ 
        Attributes:
            id (int):
            number_of_submissions (int):
            language (str):
            confidence_percentage (int):
     """

    id: int
    number_of_submissions: int
    language: str
    confidence_percentage: int
    additional_properties: Dict[str, Any] = _attrs_field(init=False, factory=dict)


    def to_dict(self) -> Dict[str, Any]:
        id = self.id

        number_of_submissions = self.number_of_submissions

        language = self.language

        confidence_percentage = self.confidence_percentage


        field_dict: Dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "id": id,
            "numberOfSubmissions": number_of_submissions,
            "language": language,
            "confidencePercentage": confidence_percentage,
        })

        return field_dict



    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        id = d.pop("id")

        number_of_submissions = d.pop("numberOfSubmissions")

        language = d.pop("language")

        confidence_percentage = d.pop("confidencePercentage")

        plagiarism_metadata_dto = cls(
            id=id,
            number_of_submissions=number_of_submissions,
            language=language,
            confidence_percentage=confidence_percentage,
        )


        plagiarism_metadata_dto.additional_properties = d
        return plagiarism_metadata_dto

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
