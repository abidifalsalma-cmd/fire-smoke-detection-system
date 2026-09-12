from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class CameraCreate(BaseModel):
    code: str = Field(
        min_length=2,
        max_length=50,
    )

    name: str = Field(
        min_length=2,
        max_length=120,
    )

    location: str = Field(
        min_length=2,
        max_length=160,
    )

    status: Literal[
        "online",
        "offline",
    ] = "online"

    stream_type: Literal[
        "simulation",
        "rtsp",
    ] = "simulation"

    video_url: str | None = None
    is_enabled: bool = True


class CameraUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
    )

    location: str | None = Field(
        default=None,
        min_length=2,
        max_length=160,
    )

    status: Literal[
        "online",
        "offline",
    ] | None = None

    stream_type: Literal[
        "simulation",
        "rtsp",
    ] | None = None

    video_url: str | None = None
    is_enabled: bool | None = None


class CameraResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    code: str
    name: str
    location: str
    status: str
    stream_type: str
    video_url: str | None
    is_enabled: bool
    created_at: datetime