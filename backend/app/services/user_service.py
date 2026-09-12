from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User


def list_users(
    database: Session,
) -> list[User]:
    statement = select(User).order_by(
        User.created_at.desc()
    )

    return list(
        database.scalars(statement).all()
    )


def get_user_by_id(
    database: Session,
    user_id: int,
) -> User | None:
    return database.get(
        User,
        user_id,
    )


def get_user_by_email(
    database: Session,
    email: str,
) -> User | None:
    normalized_email = email.strip().lower()

    return database.scalar(
        select(User).where(
            User.email == normalized_email
        )
    )


def create_user(
    database: Session,
    *,
    full_name: str,
    email: str,
    password: str,
    role: str,
) -> User:
    user = User(
        full_name=full_name.strip(),
        email=email.strip().lower(),
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )

    database.add(user)
    database.commit()
    database.refresh(user)

    return user


def update_user(
    database: Session,
    user: User,
    *,
    full_name: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
) -> User:
    if full_name is not None:
        user.full_name = full_name.strip()

    if role is not None:
        user.role = role

    if is_active is not None:
        user.is_active = is_active

    database.commit()
    database.refresh(user)

    return user