from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.user import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def read_me(db: AsyncSession = Depends(get_db)) -> UserRead:
    # TODO: resolve the current user from the auth token.
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
