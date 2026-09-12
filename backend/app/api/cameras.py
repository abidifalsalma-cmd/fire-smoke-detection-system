from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.api.detection import (
    VIDEO_OUTPUT_DIR,
    detector,
)
from app.core.database import get_database_session
from app.schemas.camera import (
    CameraCreate,
    CameraResponse,
    CameraUpdate,
)
from app.services.camera_service import (
    create_camera,
    get_all_cameras,
    get_camera_by_id,
    update_camera,
)
from app.services.incident_service import create_incident


router = APIRouter(
    prefix="/api/cameras",
    tags=["Caméras"],
)


BACKEND_DIR = Path(__file__).resolve().parents[2]

CAMERA_FEED_DIR = (
    BACKEND_DIR
    / "storage"
    / "camera_feeds"
)


@router.get(
    "",
    response_model=list[CameraResponse],
)
def list_cameras(
    include_disabled: bool = False,
    database: Session = Depends(
        get_database_session
    ),
):
    return get_all_cameras(
        database,
        include_disabled=include_disabled,
    )


@router.post(
    "",
    response_model=CameraResponse,
    status_code=201,
)
def add_camera(
    camera_data: CameraCreate,
    database: Session = Depends(
        get_database_session
    ),
):
    try:
        return create_camera(
            database,
            camera_data,
        )

    except ValueError as error:
        database.rollback()

        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error


@router.post(
    "/{camera_id}/analyze",
)
async def analyze_camera(
    camera_id: int,
    database: Session = Depends(
        get_database_session
    ),
):
    camera = get_camera_by_id(
        database,
        camera_id,
    )

    if camera is None:
        raise HTTPException(
            status_code=404,
            detail="Caméra introuvable.",
        )

    if not camera.is_enabled:
        raise HTTPException(
            status_code=409,
            detail="Cette caméra est désactivée.",
        )

    if camera.status != "online":
        raise HTTPException(
            status_code=409,
            detail="Cette caméra est hors ligne.",
        )

    if not camera.video_url:
        raise HTTPException(
            status_code=404,
            detail=(
                "Aucun flux vidéo n’est configuré "
                "pour cette caméra."
            ),
        )

    video_filename = Path(
        camera.video_url
    ).name

    video_path = (
        CAMERA_FEED_DIR
        / video_filename
    )

    if not video_path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Le fichier vidéo de cette caméra "
                "est introuvable."
            ),
        )

    analysis_id = uuid4().hex

    raw_output_path = (
        VIDEO_OUTPUT_DIR
        / f"camera_{camera_id}_{analysis_id}_raw.mp4"
    )

    final_filename = (
        f"camera_{camera_id}_{analysis_id}_annotated.mp4"
    )

    final_output_path = (
        VIDEO_OUTPUT_DIR
        / final_filename
    )

    result_video_url = (
        "/media/videos/"
        f"{final_filename}"
    )

    try:
        result = await run_in_threadpool(
            detector.detect_video_file,
            video_path,
            raw_output_path,
            final_output_path,
        )

        incident = None

        if result["has_incident"]:
            incident = create_incident(
                database,
                camera_id=camera.id,
                source_type="camera",
                original_filename=video_filename,
                location=camera.location,
                fire_count=result["fire_frames"],
                smoke_count=result["smoke_frames"],
                maximum_confidence=(
                    result["maximum_confidence"]
                ),
                media_url=result_video_url,
            )

        return {
            "status": "success",
            "camera_id": camera.id,
            "camera_code": camera.code,
            "camera_name": camera.name,
            "camera_location": camera.location,
            **result,
            "video_url": result_video_url,
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
                "Erreur pendant l’analyse "
                f"de la caméra : {error}"
            ),
        ) from error

    finally:
        if raw_output_path.exists():
            raw_output_path.unlink()


@router.patch(
    "/{camera_id}",
    response_model=CameraResponse,
)
def modify_camera(
    camera_id: int,
    camera_data: CameraUpdate,
    database: Session = Depends(
        get_database_session
    ),
):
    camera = get_camera_by_id(
        database,
        camera_id,
    )

    if camera is None:
        raise HTTPException(
            status_code=404,
            detail="Caméra introuvable.",
        )

    return update_camera(
        database,
        camera,
        camera_data,
    )


@router.get(
    "/{camera_id}",
    response_model=CameraResponse,
)
def get_camera(
    camera_id: int,
    database: Session = Depends(
        get_database_session
    ),
):
    camera = get_camera_by_id(
        database,
        camera_id,
    )

    if camera is None:
        raise HTTPException(
            status_code=404,
            detail="Caméra introuvable.",
        )

    return camera