from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from starlette.concurrency import run_in_threadpool

from app.api.detection import detector
from app.services.webcam_service import WebcamService


router = APIRouter(
    prefix="/api/webcam",
    tags=["Webcam temps réel"],
)

webcam_service = WebcamService(
    detector
)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/pjpeg",
    "application/octet-stream",
}


@router.post("/frame")
async def analyze_webcam_frame(
    session_id: str = Form(...),
    frame: UploadFile = File(...),
):
    if frame.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Format de frame non accepté. "
                "Utilisez JPEG, PNG ou WEBP."
            ),
        )

    image_bytes = await frame.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="La frame webcam est vide.",
        )

    try:
        result = await run_in_threadpool(
            webcam_service.analyze_frame,
            session_id,
            image_bytes,
        )

        return {
            "status": "success",
            "session_id": session_id,
            **result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Erreur pendant l’analyse webcam : "
                f"{error}"
            ),
        ) from error

    finally:
        await frame.close()


@router.delete(
    "/session/{session_id}"
)
def reset_webcam_session(
    session_id: str,
):
    webcam_service.reset_session(
        session_id
    )

    return {
        "status": "success",
        "message": (
            "La session webcam a été arrêtée."
        ),
    }