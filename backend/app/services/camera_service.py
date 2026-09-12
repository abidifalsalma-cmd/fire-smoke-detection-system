from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.camera import Camera
from app.schemas.camera import (
    CameraCreate,
    CameraUpdate,
)


DEFAULT_CAMERAS = [
    {
        "id": 1,
        "code": "CAM-FER-01",
        "name": "Caméra Atelier Ferraillage",
        "location": "Atelier de ferraillage et armatures",
        "status": "online",
        "stream_type": "simulation",
        "video_url": (
            "/media/cameras/camera_ferraillage.mp4"
        ),
    },
    {
        "id": 2,
        "code": "CAM-BET-02",
        "name": "Caméra Centrale à Béton",
        "location": "Centrale de dosage et de malaxage",
        "status": "online",
        "stream_type": "simulation",
        "video_url": (
            "/media/cameras/camera_parc_industriel.mp4"
        ),
    },
    {
        "id": 3,
        "code": "CAM-STK-03",
        "name": "Caméra Zone de Stockage",
        "location": "Parc des produits préfabriqués",
        "status": "online",
        "stream_type": "simulation",
        "video_url": (
            "/media/cameras/"
            "camera_parc_industriel_incident.mp4"
        ),
    },
    {
        "id": 4,
        "code": "CAM-ADM-04",
        "name": "Caméra Administration",
        "location": "Bureaux administratifs",
        "status": "online",
        "stream_type": "simulation",
        "video_url": (
            "/media/cameras/camera_administration.mp4"
        ),
    },
    {
        "id": 5,
        "code": "CAM-LOG-05",
        "name": "Caméra Accès Logistique",
        "location": (
            "Portail des livraisons "
            "et accès poids lourds"
        ),
        "status": "offline",
        "stream_type": "simulation",
        "video_url": None,
    },
]


def initialize_default_cameras(
    database: Session,
) -> None:
    for camera_data in DEFAULT_CAMERAS:
        camera_id = camera_data["id"]

        existing_camera = database.get(
            Camera,
            camera_id,
        )

        if existing_camera is None:
            database.add(
                Camera(**camera_data)
            )

    database.commit()


def get_all_cameras(
    database: Session,
    include_disabled: bool = False,
) -> list[Camera]:
    statement = select(Camera)

    if not include_disabled:
        statement = statement.where(
            Camera.is_enabled.is_(True)
        )

    statement = statement.order_by(
        Camera.id.asc()
    )

    return list(
        database.scalars(statement).all()
    )


def get_camera_by_id(
    database: Session,
    camera_id: int,
) -> Camera | None:
    return database.get(
        Camera,
        camera_id,
    )


def create_camera(
    database: Session,
    camera_data: CameraCreate,
) -> Camera:
    normalized_code = (
        camera_data.code
        .strip()
        .upper()
    )

    existing_camera = database.scalar(
        select(Camera).where(
            Camera.code == normalized_code
        )
    )

    if existing_camera is not None:
        raise ValueError(
            "Une caméra utilise déjà ce code."
        )

    camera_values = camera_data.model_dump()
    camera_values["code"] = normalized_code
    camera_values["name"] = (
        camera_data.name.strip()
    )
    camera_values["location"] = (
        camera_data.location.strip()
    )

    camera = Camera(**camera_values)

    database.add(camera)
    database.commit()
    database.refresh(camera)

    return camera


def update_camera(
    database: Session,
    camera: Camera,
    camera_data: CameraUpdate,
) -> Camera:
    updates = camera_data.model_dump(
        exclude_unset=True,
    )

    for field, value in updates.items():
        if (
            isinstance(value, str)
            and field in {"name", "location"}
        ):
            value = value.strip()

        setattr(camera, field, value)

    database.commit()
    database.refresh(camera)

    return camera