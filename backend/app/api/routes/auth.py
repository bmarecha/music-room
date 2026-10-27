import logging
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.oauth import verify_google_id_token
from app.core.security import (
    create_access_token,
    create_action_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleOAuthRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.user import UserRead

logger = logging.getLogger("musicroom.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Register a new user with email and password."""
    existing_user = await db.execute(select(User).where(User.email == payload.email))
    if existing_user.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        public_name=payload.public_name,
        is_email_validated=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Generate verification token and log mock link
    verify_token = create_action_token(user.email, action="verify_email")
    logger.info(
        "MOCK EMAIL DISPATCH: verify email for %s -> token: %s",
        user.email,
        verify_token,
    )

    access_token = create_access_token(user.id)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        is_email_validated=user.is_email_validated,
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate with email and password."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account was created using Google. Please sign in with Google.",
        )
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(user.id)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        is_email_validated=user.is_email_validated,
        user=UserRead.model_validate(user),
    )


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    payload: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Validate email using the verification token."""
    try:
        data = decode_token(payload.token)
        if data.get("action") != "verify_email":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token",
            )
        email = data.get("sub")
    except (jwt.PyJWTError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        ) from exc

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_email_validated = True
    await db.commit()
    return MessageResponse(message="Email verified successfully")


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    payload: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Resend email verification token."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is not None and not user.is_email_validated:
        verify_token = create_action_token(user.email, action="verify_email")
        logger.info(
            "MOCK EMAIL DISPATCH: resent verification for %s -> token: %s",
            user.email,
            verify_token,
        )

    return MessageResponse(
        message="If the account exists and is unverified, a new verification link has been sent."
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Initiate password reset flow."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is not None:
        reset_token = create_action_token(user.email, action="reset_password")
        logger.info(
            "MOCK EMAIL DISPATCH: password reset for %s -> token: %s",
            user.email,
            reset_token,
        )

    return MessageResponse(
        message="If an account exists with this email, a password reset link has been sent."
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Reset password using a valid reset token."""
    try:
        data = decode_token(payload.token)
        if data.get("action") != "reset_password":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )
        email = data.get("sub")
    except (jwt.PyJWTError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        ) from exc

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return MessageResponse(message="Password reset successfully")


@router.post("/oauth/google", response_model=TokenResponse)
async def google_oauth(
    payload: GoogleOAuthRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate or register via Google ID token."""
    google_data = await verify_google_id_token(payload.id_token)
    google_id = google_data["sub"]
    email = google_data.get("email")
    public_name = google_data.get("name", "Music Lover")

    # 1. Search by existing google_id
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    # 2. If not found by google_id, check if email exists to link
    if user is None and email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is not None:
            user.google_id = google_id
            user.is_email_validated = True  # Verified by Google provider
            await db.commit()
            await db.refresh(user)

    # 3. Create new user if not found
    if user is None:
        user = User(
            google_id=google_id,
            email=email,
            password_hash=None,
            public_name=public_name,
            is_email_validated=True,  # Google verified email
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(user.id)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        is_email_validated=user.is_email_validated,
        user=UserRead.model_validate(user),
    )


@router.post("/oauth/link/google", response_model=UserRead)
async def link_google(
    payload: GoogleOAuthRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Link Google account to the currently authenticated user."""
    google_data = await verify_google_id_token(payload.id_token)
    google_id = google_data["sub"]

    # Check if another account is already linked with this Google ID
    result = await db.execute(
        select(User).where(User.google_id == google_id, User.id != current_user.id)
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This Google account is already linked to another user",
        )

    current_user.google_id = google_id
    await db.commit()
    await db.refresh(current_user)
    return current_user
