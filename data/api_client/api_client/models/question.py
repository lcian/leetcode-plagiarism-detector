from typing import Any, Dict, Type, TypeVar, Tuple, Optional, BinaryIO, TextIO, TYPE_CHECKING

from typing import List


from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast, List
from typing import Union
from ..types import UNSET, Unset






T = TypeVar("T", bound="Question")


@_attrs_define
class Question:
    """ 
        Attributes:
            id (Union[Unset, int]):
            number (Union[Unset, int]):
            number_in_contest (Union[Unset, int]):
            name (Union[Unset, str]):
            description (Union[Unset, str]):
            detector_run_ids (Union[Unset, List[int]]):
            contest_id (Union[Unset, int]):
     """

    id: Union[Unset, int] = UNSET
    number: Union[Unset, int] = UNSET
    number_in_contest: Union[Unset, int] = UNSET
    name: Union[Unset, str] = UNSET
    description: Union[Unset, str] = UNSET
    detector_run_ids: Union[Unset, List[int]] = UNSET
    contest_id: Union[Unset, int] = UNSET
    additional_properties: Dict[str, Any] = _attrs_field(init=False, factory=dict)


    def to_dict(self) -> Dict[str, Any]:
        id = self.id

        number = self.number

        number_in_contest = self.number_in_contest

        name = self.name

        description = self.description

        detector_run_ids: Union[Unset, List[int]] = UNSET
        if not isinstance(self.detector_run_ids, Unset):
            detector_run_ids = self.detector_run_ids



        contest_id = self.contest_id


        field_dict: Dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if id is not UNSET:
            field_dict["id"] = id
        if number is not UNSET:
            field_dict["number"] = number
        if number_in_contest is not UNSET:
            field_dict["numberInContest"] = number_in_contest
        if name is not UNSET:
            field_dict["name"] = name
        if description is not UNSET:
            field_dict["description"] = description
        if detector_run_ids is not UNSET:
            field_dict["detectorRunIds"] = detector_run_ids
        if contest_id is not UNSET:
            field_dict["contestId"] = contest_id

        return field_dict



    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        id = d.pop("id", UNSET)

        number = d.pop("number", UNSET)

        number_in_contest = d.pop("numberInContest", UNSET)

        name = d.pop("name", UNSET)

        description = d.pop("description", UNSET)

        detector_run_ids = cast(List[int], d.pop("detectorRunIds", UNSET))


        contest_id = d.pop("contestId", UNSET)

        question = cls(
            id=id,
            number=number,
            number_in_contest=number_in_contest,
            name=name,
            description=description,
            detector_run_ids=detector_run_ids,
            contest_id=contest_id,
        )


        question.additional_properties = d
        return question

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
