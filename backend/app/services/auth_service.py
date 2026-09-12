from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    hash_password,
    verify_password,
)
from app.models.user import User


DEFAULT_ADMIN_EMAIL = "admin@menaraprefa.ma"
DEFAULT_ADMIN_PASSWORD = "Menara@2026"


def initialize_default_admin(
    database: Session,
) -> User:
    existing_user = database.scalar(
        select(User).where(
            User.email == DEFAULT_ADMIN_EMAIL
        )
    )

    if existing_user:
        return existing_user

    administrator = User(
        full_name="Salma Abidi Fal",
        email=DEFAULT_ADMIN_EMAIL,
        password_hash=hash_password(
            DEFAULT_ADMIN_PASSWORD
        ),
        role="administrator",
        is_active=True,
    )

    database.add(administrator)
    database.commit()
    database.refresh(administrator)

    return administrator


def authenticate_user(
    database: Session,
    email: str,
    password: str,
) -> User | None:
    normalized_email = email.strip().lower()

    user = database.scalar(
        select(User).where(
            User.email == normalized_email
        )
    )

    if not user or not user.is_active:
        return None

    if not verify_password(
        password,
        user.password_hash,
    ):
        return None

    return user