import base64
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.database import get_database_session
from app.services.detector_service import DetectorService
from app.services.incident_service import create_incident


router = APIRouter(
    prefix="/api/detection",
    tags=["Détection"],
)

detector = DetectorService()

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_VIDEO_EXTENSIONS = {
    ".mp4",
    ".avi",
    ".mov",
    ".webm",
}

MAX_VIDEO_SIZE = 100 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024

BACKEND_DIR = Path(__file__).resolve().parents[2]
STORAGE_DIR = BACKEND_DIR / "storage"

IMAGE_OUTPUT_DIR = STORAGE_DIR / "image_outputs"
VIDEO_UPLOAD_DIR = STORAGE_DIR / "video_uploads"
VIDEO_OUTPUT_DIR = STORAGE_DIR / "video_outputs"

IMAGE_OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

VIDEO_UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

VIDEO_OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


@router.post("/image")
async def detect_image(
    file: UploadFile = File(...),
    database: Session = Depends(
        get_database_session
    ),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Format non accepté. "
                "Utilisez JPG, PNG ou WEBP."
            ),
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Le fichier envoyé est vide.",
        )

    try:
        result = await run_in_threadpool(
            detector.detect_image_bytes,
            image_bytes,
        )

        maximum_confidence = max(
            (
                detection["confidence"]
                for detection in result["detections"]
            ),
            default=0.0,
        )

        image_url = None
        annotated_image = result.get("annotated_image")

        if result["has_incident"] and annotated_image:
            if "," in annotated_image:
                annotated_image = annotated_image.split(
                    ",",
                    1,
                )[1]

            image_filename = (
                f"{uuid4().hex}_annotated.jpg"
            )

            image_output_path = (
                IMAGE_OUTPUT_DIR
                / image_filename
            )

            image_output_path.write_bytes(
                base64.b64decode(annotated_image)
            )

            image_url = (
                "/media/images/"
                f"{image_filename}"
            )

        incident = create_incident(
            database,
            source_type="image",
            original_filename=(
                file.filename or "image"
            ),
            fire_count=result["fire_count"],
            smoke_count=result["smoke_count"],
            maximum_confidence=maximum_confidence,
            media_url=image_url,
        )

        return {
            "filename": file.filename,
            "status": "success",
            **result,
            "media_url": image_url,
            "incident_id": (
                incident.id
                if incident is not None
                else None
            ),
            "severity": (
                incident.severity
                if incident is not None
                else None
            ),
        }

    except ValueError as error:
        database.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        database.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Erreur pendant la détection : "
                f"{error}"
            ),
        ) from error

    finally:
        await file.close()


@router.post("/video")
async def detect_video(
    file: UploadFile = File(...),
    database: Session = Depends(
        get_database_session
    ),
):
    original_filename = file.filename or "video.mp4"

    extension = Path(
        original_filename
    ).suffix.lower()

    if extension not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=(
                "Format vidéo non accepté. "
                "Utilisez MP4, AVI, MOV ou WEBM."
            ),
        )

    unique_id = uuid4().hex

    upload_path = (
        VIDEO_UPLOAD_DIR
        / f"{unique_id}{extension}"
    )

    raw_output_path = (
        VIDEO_OUTPUT_DIR
        / f"{unique_id}_raw.mp4"
    )

    final_filename = (
        f"{unique_id}_annotated.mp4"
    )

    final_output_path = (
        VIDEO_OUTPUT_DIR
        / final_filename
    )

    video_url = (
        "/media/videos/"
        f"{final_filename}"
    )

    total_size = 0

    try:
        with open(upload_path, "wb") as output_file:
            while chunk := await file.read(CHUNK_SIZE):
                total_size += len(chunk)

                if total_size > MAX_VIDEO_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "La vidéo dépasse la taille "
                            "maximale de 100 Mo."
                        ),
                    )

                output_file.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=400,
                detail="La vidéo envoyée est vide.",
            )

        result = await run_in_threadpool(
            detector.detect_video_file,
            upload_path,
            raw_output_path,
            final_output_path,
        )

        incident = None

        if result["has_incident"]:
            incident = create_incident(
                database,
                source_type="video",
                original_filename=original_filename,
                fire_count=result["fire_frames"],
                smoke_count=result["smoke_frames"],
                maximum_confidence=(
                    result["maximum_confidence"]
                ),
                media_url=video_url,
            )

        return {
            "filename": original_filename,
            "status": "success",
            **result,
            "video_url": video_url,
            "incident_id": (
                incident.id
                if incident is not None
                else None
            ),
            "severity": (
                incident.severity
                if incident is not None
                else None
            ),
        }

    except HTTPException:
        database.rollback()
        raise

    except ValueError as error:
        database.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        database.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Erreur pendant l’analyse vidéo : "
                f"{error}"
            ),
        ) from error

    finally:
        await file.close()

        if upload_path.exists():
            upload_path.unlink()

        if raw_output_path.exists():
            raw_output_path.unlink()