from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_database_session
from app.models.incident import Incident
from app.schemas.incident import (
    IncidentResponse,
    IncidentStatsResponse,
)
from app.services.incident_service import (
    acknowledge_incident,
    get_incident,
    resolve_incident,
)


router = APIRouter(
    prefix="/api/incidents",
    tags=["Incidents"],
)


class IncidentCommentRequest(BaseModel):
    comment: str = Field(
        min_length=2,
        max_length=1000,
    )


def require_incident(
    database: Session,
    incident_id: int,
) -> Incident:
    incident = get_incident(
        database,
        incident_id,
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident introuvable.",
        )

    return incident


def append_note(
    incident: Incident,
    note: str,
) -> None:
    timestamp = datetime.now().strftime(
        "%d/%m/%Y à %H:%M"
    )
    new_note = f"[{timestamp}] {note.strip()}"

    incident.notes = (
        f"{incident.notes}\n{new_note}"
        if incident.notes
        else new_note
    )


@router.get(
    "",
    response_model=list[IncidentResponse],
)
def get_incidents(
    status: str | None = None,
    severity: str | None = None,
    camera_id: int | None = Query(
        default=None,
        ge=1,
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    database: Session = Depends(
        get_database_session
    ),
):
    statement = select(Incident)

    if status:
        statement = statement.where(
            Incident.status == status
        )

    if severity:
        statement = statement.where(
            Incident.severity == severity
        )

    if camera_id is not None:
        statement = statement.where(
            Incident.camera_id == camera_id
        )

    statement = (
        statement
        .order_by(Incident.created_at.desc())
        .limit(limit)
    )

    return list(
        database.scalars(statement).all()
    )


@router.get(
    "/stats",
    response_model=IncidentStatsResponse,
)
def get_incident_stats(
    camera_id: int | None = Query(
        default=None,
        ge=1,
    ),
    database: Session = Depends(
        get_database_session
    ),
):
    def count_with_condition(condition=None):
        statement = (
            select(func.count())
            .select_from(Incident)
        )

        if camera_id is not None:
            statement = statement.where(
                Incident.camera_id == camera_id
            )

        if condition is not None:
            statement = statement.where(condition)

        return int(
            database.scalar(statement) or 0
        )

    active_statuses = or_(
        Incident.status == "active",
        Incident.status == "in_progress",
        Incident.status == "confirmed",
    )

    return {
        "total_incidents": count_with_condition(),
        "active_incidents": count_with_condition(
            active_statuses
        ),
        "resolved_incidents": count_with_condition(
            Incident.status == "resolved"
        ),
        "fire_incidents": count_with_condition(
            Incident.detected_fire.is_(True)
        ),
        "smoke_incidents": count_with_condition(
            Incident.detected_smoke.is_(True)
        ),
        "critical_incidents": count_with_condition(
            Incident.severity == "critical"
        ),
    }


@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
)
def get_incident_by_id(
    incident_id: int,
    database: Session = Depends(
        get_database_session
    ),
):
    return require_incident(
        database,
        incident_id,
    )


@router.patch(
    "/{incident_id}/acknowledge",
    response_model=IncidentResponse,
)
def acknowledge_incident_alert(
    incident_id: int,
    database: Session = Depends(
        get_database_session
    ),
):
    incident = require_incident(
        database,
        incident_id,
    )

    if incident.status in {
        "resolved",
        "false_alarm",
    }:
        raise HTTPException(
            status_code=409,
            detail="Cet incident est déjà clôturé.",
        )

    if incident.status in {
        "in_progress",
        "confirmed",
    }:
        return incident

    return acknowledge_incident(
        database,
        incident,
    )


@router.patch(
    "/{incident_id}/confirm",
    response_model=IncidentResponse,
)
def confirm_incident(
    incident_id: int,
    database: Session = Depends(
        get_database_session
    ),
):
    incident = require_incident(
        database,
        incident_id,
    )

    if incident.status in {
        "resolved",
        "false_alarm",
    }:
        raise HTTPException(
            status_code=409,
            detail=(
                "Un incident clôturé ne peut pas "
                "être confirmé."
            ),
        )

    if incident.status == "confirmed":
        return incident

    incident.status = "confirmed"
    append_note(
        incident,
        "Incident confirmé par l’opérateur.",
    )

    database.commit()
    database.refresh(incident)

    return incident


@router.patch(
    "/{incident_id}/false-alarm",
    response_model=IncidentResponse,
)
def mark_as_false_alarm(
    incident_id: int,
    database: Session = Depends(
        get_database_session
    ),
):
    incident = require_incident(
        database,
        incident_id,
    )

    if incident.status == "resolved":
        raise HTTPException(
            status_code=409,
            detail=(
                "Un incident résolu ne peut pas être "
                "classé comme fausse alerte."
            ),
        )

    if incident.status == "false_alarm":
        return incident

    incident.status = "false_alarm"
    incident.resolved_at = datetime.now(
        timezone.utc
    )
    append_note(
        incident,
        "Détection classée comme fausse alerte.",
    )

    database.commit()
    database.refresh(incident)

    return incident


@router.patch(
    "/{incident_id}/comment",
    response_model=IncidentResponse,
)
def add_incident_comment(
    incident_id: int,
    request: IncidentCommentRequest,
    database: Session = Depends(
        get_database_session
    ),
):
    incident = require_incident(
        database,
        incident_id,
    )

    append_note(
        incident,
        request.comment,
    )

    database.commit()
    database.refresh(incident)

    return incident


@router.patch(
    "/{incident_id}/resolve",
    response_model=IncidentResponse,
)
def mark_incident_as_resolved(
    incident_id: int,
    database: Session = Depends(
        get_database_session
    ),
):
    incident = require_incident(
        database,
        incident_id,
    )

    if incident.status == "false_alarm":
        raise HTTPException(
            status_code=409,
            detail=(
                "Cette détection est déjà classée "
                "comme fausse alerte."
            ),
        )

    if incident.status == "resolved":
        return incident

    return resolve_incident(
        database,
        incident,
    )