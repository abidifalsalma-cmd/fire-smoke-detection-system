from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import (
    DeclarativeBase,
    sessionmaker,
)


BACKEND_DIR = Path(__file__).resolve().parents[2]

STORAGE_DIR = BACKEND_DIR / "storage"

STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

DATABASE_PATH = (
    STORAGE_DIR
    / "menara_fire_safety.db"
)

DATABASE_URL = (
    f"sqlite:///{DATABASE_PATH.as_posix()}"
)


engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
    },
)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def get_database_session():
    database = SessionLocal()

    try:
        yield database

    finally:
        database.close()