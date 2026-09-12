from typing import Literal

from pydantic import (
    BaseModel,
    Field,
)


class UserCreateRequest(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=150,
    )

    email: str = Field(
        min_length=5,
        max_length=255,
    )

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    role: Literal[
        "administrator",
        "operator",
    ] = "operator"


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    role: Literal[
        "administrator",
        "operator",
    ] | None = None

    is_active: bool | None = None