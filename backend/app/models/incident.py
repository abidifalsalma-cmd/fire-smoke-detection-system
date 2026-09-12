from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.core.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    camera_id: Mapped[int | None] = mapped_column(
        ForeignKey("cameras.id"),
        nullable=True,
        index=True,
    )

    source_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    location: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        default="Menara Prefa",
    )

    detected_fire: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    detected_smoke: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    fire_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    smoke_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    maximum_confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="medium",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="active",
    )

    media_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )