from typing import Any, Dict, Type, TypeVar, Tuple, Optional, BinaryIO, TextIO, TYPE_CHECKING

from typing import List


from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="SubmissionDTO")


@_attrs_define
class SubmissionDTO:
    """ 
        Attributes:
            id (int):
            code (str):
            language (str):
            date (int):
            user_slug (str):
            page (int):
            question_id (int):
     """

    id: int
    code: str
    language: str
    date: int
    user_slug: str
    page: int
    question_id: int
    additional_properties: Dict[str, Any] = _attrs_field(init=False, factory=dict)


    def to_dict(self) -> Dict[str, Any]:
        id = self.id

        code = self.code

        language = self.language

        date = self.date

        user_slug = self.user_slug

        page = self.page

        question_id = self.question_id


        field_dict: Dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "id": id,
            "code": code,
            "language": language,
            "date": date,
            "userSlug": user_slug,
            "page": page,
            "questionId": question_id,
        })

        return field_dict



    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        id = d.pop("id")

        code = d.pop("code")

        language = d.pop("language")

        date = d.pop("date")

        user_slug = d.pop("userSlug")

        page = d.pop("page")

        question_id = d.pop("questionId")

        submission_dto = cls(
            id=id,
            code=code,
            language=language,
            date=date,
            user_slug=user_slug,
            page=page,
            question_id=question_id,
        )


        submission_dto.additional_properties = d
        return submission_dto

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
