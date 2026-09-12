from contextlib import asynccontextmanager
from pathlib import Path
from app.services.auth_service import initialize_default_admin
from app.api.auth import router as auth_router
from app.models.password_reset_token import PasswordResetToken

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.cameras import router as cameras_router
from app.api.detection import router as detection_router
from app.api.incidents import router as incidents_router
from app.core.database import Base, engine, SessionLocal
from app.models import Camera, Incident, User
from app.services.camera_service import initialize_default_cameras
from app.api.users import router as users_router
from app.api.webcam import router as webcam_router


BACKEND_DIR = Path(__file__).resolve().parents[1]

VIDEO_OUTPUT_DIR = (
    BACKEND_DIR
    / "storage"
    / "video_outputs"
)

VIDEO_OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

IMAGE_OUTPUT_DIR = (
    BACKEND_DIR
    / "storage"
    / "image_outputs"
)

IMAGE_OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

CAMERA_FEED_DIR = (
    BACKEND_DIR
    / "storage"
    / "camera_feeds"
)

CAMERA_FEED_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(
        bind=engine,
    )

    with SessionLocal() as database:
        initialize_default_cameras(database)
        initialize_default_admin(database)

    yield


app = FastAPI(
    title="Menara Fire Safety API",
    description=(
        "API de détection intelligente "
        "de feu et de fumée"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/media/videos",
    StaticFiles(
        directory=str(VIDEO_OUTPUT_DIR),
    ),
    name="video_outputs",
)

app.mount(
    "/media/images",
    StaticFiles(
        directory=str(IMAGE_OUTPUT_DIR),
    ),
    name="image_outputs",
)

app.mount(
    "/media/cameras",
    StaticFiles(
        directory=str(CAMERA_FEED_DIR),
    ),
    name="camera_feeds",
)

app.include_router(auth_router)
app.include_router(cameras_router)
app.include_router(detection_router)
app.include_router(incidents_router)
app.include_router(users_router)
app.include_router(webcam_router)


@app.get("/")
def accueil():
    return {
        "application": "Menara Fire Safety",
        "message": "Backend opérationnel",
        "status": "online",
    }


@app.get("/health")
def verifier_sante():
    return {
        "status": "healthy",
        "service": "backend",
    }