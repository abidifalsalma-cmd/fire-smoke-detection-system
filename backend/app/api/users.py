from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_database_session
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.user_management import (
    UserCreateRequest,
    UserUpdateRequest,
)
from app.services.user_service import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    list_users,
    update_user,
)


router = APIRouter(
    prefix="/api/users",
    tags=["Utilisateurs"],
)


def require_administrator(
    current_user: User = Depends(
        get_current_user
    ),
) -> User:
    if current_user.role != "administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Cette action est réservée "
                "aux administrateurs."
            ),
        )

    return current_user


@router.get(
    "",
    response_model=list[UserResponse],
)
def get_users(
    database: Session = Depends(
        get_database_session
    ),
    administrator: User = Depends(
        require_administrator
    ),
):
    return list_users(database)


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_user(
    request: UserCreateRequest,
    database: Session = Depends(
        get_database_session
    ),
    administrator: User = Depends(
        require_administrator
    ),
):
    existing_user = get_user_by_email(
        database,
        request.email,
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Un utilisateur utilise déjà "
                "cette adresse email."
            ),
        )

    return create_user(
        database,
        full_name=request.full_name,
        email=request.email,
        password=request.password,
        role=request.role,
    )


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
)
def modify_user(
    user_id: int,
    request: UserUpdateRequest,
    database: Session = Depends(
        get_database_session
    ),
    administrator: User = Depends(
        require_administrator
    ),
):
    user = get_user_by_id(
        database,
        user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable.",
        )

    is_disabling_self = (
        user.id == administrator.id
        and request.is_active is False
    )

    is_removing_own_admin_role = (
        user.id == administrator.id
        and request.role == "operator"
    )

    if is_disabling_self:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Vous ne pouvez pas désactiver "
                "votre propre compte."
            ),
        )

    if is_removing_own_admin_role:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Vous ne pouvez pas retirer "
                "votre propre rôle administrateur."
            ),
        )

    return update_user(
        database,
        user,
        full_name=request.full_name,
        role=request.role,
        is_active=request.is_active,
    )