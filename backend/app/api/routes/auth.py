from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/auth", tags=["auth"])

# TODO: register (mail/password), email verification, login, password reset,
# OAuth Google / Facebook, account linking.


@router.post("/register", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def register() -> None:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.post("/login", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def login() -> None:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
