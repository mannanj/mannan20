from typing import Any, Self

from pydantic import BaseModel, ConfigDict


def to_camel(field_name: str) -> str:
    head, *tail = field_name.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in tail)


class ApiSchema(BaseModel):
    """Base class for public API contracts."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        validate_by_alias=True,
        validate_by_name=False,
    )

    @classmethod
    def from_python(cls, data: Any) -> Self:
        return cls.model_validate(data, by_alias=True, by_name=True)
