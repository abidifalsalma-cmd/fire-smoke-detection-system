from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.services.email_service import send_incident_alert_async


def determine_severity(
    detected_fire: bool,
    detected_smoke: bool,
    maximum_confidence: float,
) -> str:
    if detected_fire and detected_smoke:
        return "critical"

    if detected_fire:
        return "high"

    if (
        detected_smoke
        and maximum_confidence >= 0.75
    ):
        return "high"

    return "medium"


def create_incident(
    database: Session,
    *,
    source_type: str,
    original_filename: str,
    fire_count: int,
    smoke_count: int,
    maximum_confidence: float,
    media_url: str | None = None,
    location: str = "Menara Prefa",
    camera_id: int | None = None,
) -> Incident | None:
    detected_fire = fire_count > 0
    detected_smoke = smoke_count > 0

    if not detected_fire and not detected_smoke:
        return None

    severity = determine_severity(
        detected_fire=detected_fire,
        detected_smoke=detected_smoke,
        maximum_confidence=maximum_confidence,
    )

    incident = Incident(
        camera_id=camera_id,
        source_type=source_type,
        original_filename=original_filename,
        location=location,
        detected_fire=detected_fire,
        detected_smoke=detected_smoke,
        fire_count=fire_count,
        smoke_count=smoke_count,
        maximum_confidence=maximum_confidence,
        severity=severity,
        status="active",
        media_url=media_url,
    )

    database.add(incident)
    database.commit()
    database.refresh(incident)

    # L'incident est déjà enregistré. L'envoi s'effectue ensuite dans
    # un thread séparé : une panne Gmail ne bloque pas l'application.
    send_incident_alert_async(
        incident_id=incident.id,
        location=incident.location,
        source_type=incident.source_type,
        detected_fire=incident.detected_fire,
        detected_smoke=incident.detected_smoke,
        maximum_confidence=incident.maximum_confidence,
        severity=incident.severity,
    )

    return incident


def list_incidents(
    database: Session,
    limit: int = 100,
    camera_id: int | None = None,
) -> list[Incident]:
    statement = select(Incident)

    if camera_id is not None:
        statement = statement.where(
            Incident.camera_id == camera_id,
        )

    statement = (
        statement
        .order_by(Incident.created_at.desc())
        .limit(limit)
    )

    return list(
        database.scalars(statement).all()
    )


def get_incident(
    database: Session,
    incident_id: int,
) -> Incident | None:
    return database.get(
        Incident,
        incident_id,
    )


def acknowledge_incident(
    database: Session,
    incident: Incident,
) -> Incident:
    incident.status = "in_progress"

    incident.notes = (
        "Incident pris en charge "
        "par le responsable de sécurité."
    )

    database.commit()
    database.refresh(incident)

    return incident


def resolve_incident(
    database: Session,
    incident: Incident,
) -> Incident:
    incident.status = "resolved"
    incident.resolved_at = datetime.now(timezone.utc)

    database.commit()
    database.refresh(incident)

    return incident