import hashlib
import secrets
from datetime import (
    datetime,
    timedelta,
    timezone,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User


RESET_TOKEN_EXPIRE_MINUTES = 15


def _hash_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def create_password_reset_token(
    database: Session,
    user: User,
) -> str:
    previous_tokens = database.scalars(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
    ).all()

    now = datetime.now(timezone.utc)

    for previous_token in previous_tokens:
        previous_token.used_at = now

    raw_token = secrets.token_urlsafe(48)

    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=now + timedelta(
            minutes=RESET_TOKEN_EXPIRE_MINUTES
        ),
    )

    database.add(reset_token)
    database.commit()

    return raw_token


def reset_user_password(
    database: Session,
    token: str,
    new_password: str,
) -> bool:
    token_record = database.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash
            == _hash_token(token)
        )
    )

    if token_record is None:
        return False

    if token_record.used_at is not None:
        return False

    now = datetime.now(timezone.utc)
    expires_at = token_record.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(
            tzinfo=timezone.utc
        )

    if expires_at <= now:
        return False

    user = database.get(
        User,
        token_record.user_id,
    )

    if user is None or not user.is_active:
        return False

    user.password_hash = hash_password(
        new_password
    )
    token_record.used_at = now

    database.commit()

    return True