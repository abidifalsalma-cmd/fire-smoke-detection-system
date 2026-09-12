from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_database_session
from app.core.security import (
    create_access_token,
    decode_access_token,
)
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    ResetPasswordRequest,
    UserResponse,
)
from app.services.auth_service import authenticate_user
from app.services.email_service import (
    send_password_reset_email_async,
)
from app.services.password_reset_service import (
    create_password_reset_token,
    reset_user_password,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentification"],
)

bearer_scheme = HTTPBearer(
    auto_error=False,
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    database: Session = Depends(
        get_database_session
    ),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise.",
        )

    email = decode_access_token(
        credentials.credentials
    )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton invalide ou expiré.",
        )

    user = database.scalar(
        select(User).where(
            User.email == email
        )
    )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou désactivé.",
        )

    return user


@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    request: LoginRequest,
    database: Session = Depends(
        get_database_session
    ),
):
    user = authenticate_user(
        database=database,
        email=request.email,
        password=request.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

    token = create_access_token(
        user.email
    )

    return LoginResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
)
def forgot_password(
    request: ForgotPasswordRequest,
    database: Session = Depends(
        get_database_session
    ),
):
    normalized_email = request.email.strip().lower()

    user = database.scalar(
        select(User).where(
            User.email == normalized_email
        )
    )

    if user is not None and user.is_active:
        reset_token = create_password_reset_token(
            database,
            user,
        )

        send_password_reset_email_async(
            recipient_email=user.email,
            reset_token=reset_token,
        )

    return MessageResponse(
        message=(
            "Si cette adresse correspond à un compte actif, "
            "un lien de réinitialisation a été envoyé."
        )
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
)
def reset_password(
    request: ResetPasswordRequest,
    database: Session = Depends(
        get_database_session
    ),
):
    password_changed = reset_user_password(
        database=database,
        token=request.token,
        new_password=request.new_password,
    )

    if not password_changed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Le lien est invalide, expiré "
                "ou a déjà été utilisé."
            ),
        )

    return MessageResponse(
        message=(
            "Votre mot de passe a été modifié avec succès."
        )
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_profile(
    current_user: User = Depends(
        get_current_user
    ),
):
    return current_user