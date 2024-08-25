from typing import Any, Dict, Type, TypeVar, Tuple, Optional, BinaryIO, TextIO, TYPE_CHECKING

from typing import List


from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import Union






T = TypeVar("T", bound="QuestionDTO")


@_attrs_define
class QuestionDTO:
    """ 
        Attributes:
            number_in_contest (int):
            name (str):
            description (str):
            contest_slug (str):
            id (Union[Unset, int]):
            number (Union[Unset, int]):
     """

    number_in_contest: int
    name: str
    description: str
    contest_slug: str
    id: Union[Unset, int] = UNSET
    number: Union[Unset, int] = UNSET
    additional_properties: Dict[str, Any] = _attrs_field(init=False, factory=dict)


    def to_dict(self) -> Dict[str, Any]:
        number_in_contest = self.number_in_contest

        name = self.name

        description = self.description

        contest_slug = self.contest_slug

        id = self.id

        number = self.number


        field_dict: Dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "numberInContest": number_in_contest,
            "name": name,
            "description": description,
            "contestSlug": contest_slug,
        })
        if id is not UNSET:
            field_dict["id"] = id
        if number is not UNSET:
            field_dict["number"] = number

        return field_dict



    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        number_in_contest = d.pop("numberInContest")

        name = d.pop("name")

        description = d.pop("description")

        contest_slug = d.pop("contestSlug")

        id = d.pop("id", UNSET)

        number = d.pop("number", UNSET)

        question_dto = cls(
            number_in_contest=number_in_contest,
            name=name,
            description=description,
            contest_slug=contest_slug,
            id=id,
            number=number,
        )


        question_dto.additional_properties = d
        return question_dto

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
