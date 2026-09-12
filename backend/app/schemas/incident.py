from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
)


class IncidentResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    camera_id: int | None

    source_type: str
    original_filename: str
    location: str

    detected_fire: bool
    detected_smoke: bool

    fire_count: int
    smoke_count: int

    maximum_confidence: float
    severity: str
    status: str

    media_url: str | None
    notes: str | None

    created_at: datetime
    resolved_at: datetime | None


class IncidentStatsResponse(BaseModel):
    total_incidents: int
    active_incidents: int
    resolved_incidents: int

    fire_incidents: int
    smoke_incidents: int
    critical_incidents: int