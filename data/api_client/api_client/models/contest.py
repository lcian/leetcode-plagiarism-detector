from typing import Any, Dict, Type, TypeVar, Tuple, Optional, BinaryIO, TextIO, TYPE_CHECKING

from typing import List


from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast, List
from typing import Union
from ..types import UNSET, Unset






T = TypeVar("T", bound="Contest")


@_attrs_define
class Contest:
    """ 
        Attributes:
            id (int):
            slug (str):
            question_ids (Union[Unset, List[int]]):
     """

    id: int
    slug: str
    question_ids: Union[Unset, List[int]] = UNSET
    additional_properties: Dict[str, Any] = _attrs_field(init=False, factory=dict)


    def to_dict(self) -> Dict[str, Any]:
        id = self.id

        slug = self.slug

        question_ids: Union[Unset, List[int]] = UNSET
        if not isinstance(self.question_ids, Unset):
            question_ids = self.question_ids




        field_dict: Dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "id": id,
            "slug": slug,
        })
        if question_ids is not UNSET:
            field_dict["questionIds"] = question_ids

        return field_dict



    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        id = d.pop("id")

        slug = d.pop("slug")

        question_ids = cast(List[int], d.pop("questionIds", UNSET))


        contest = cls(
            id=id,
            slug=slug,
            question_ids=question_ids,
        )


        contest.additional_properties = d
        return contest

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
