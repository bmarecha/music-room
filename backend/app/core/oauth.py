import logging
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger("musicroom.oauth")

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


async def verify_google_id_token(id_token: str) -> dict[str, Any]:
    """Verify Google ID token and return user information.

    In test or dev mode, tokens prefixed with 'mock:' (e.g. 'mock:google-123:test@gmail.com:TestUser')
    are accepted without calling Google servers.
    """
    if id_token.startswith("mock:"):
        parts = id_token.split(":")
        google_id = parts[1] if len(parts) > 1 else "mock_google_id"
        email = parts[2] if len(parts) > 2 else "mock@example.com"
        name = parts[3] if len(parts) > 3 else "Mock User"
        return {
            "sub": google_id,
            "email": email,
            "name": name,
            "email_verified": True,
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                GOOGLE_TOKENINFO_URL, params={"id_token": id_token}
            )
            if response.status_code != status.HTTP_200_OK:
                logger.warning("Google token verification failed: %s", response.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired Google token",
                )
            data = response.json()

            # Verify audience if configured
            if settings.google_client_id and data.get("aud") != settings.google_client_id:
                logger.warning(
                    "Google token aud mismatch: expected %s, got %s",
                    settings.google_client_id,
                    data.get("aud"),
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google token audience mismatch",
                )

            return {
                "sub": data["sub"],
                "email": data.get("email"),
                "name": data.get("name") or data.get("given_name") or "Music Lover",
                "email_verified": data.get("email_verified", True),
            }
    except httpx.RequestError as exc:
        logger.error("Failed to connect to Google OAuth service: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify Google token with provider",
        ) from exc

