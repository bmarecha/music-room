from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import Friendship, PreferenceType, User, UserMusicPreference, VisibilityLevel
from app.schemas.user import (
    MusicPreferenceRead,
    ProfileRead,
    ProfileUpdate,
    UserRead,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def read_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


async def _is_friend(
    viewer_id: int, target_id: int, db: AsyncSession
) -> bool:
    if viewer_id == target_id:
        return True
    result = await db.execute(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                (Friendship.user_id == viewer_id)
                & (Friendship.friend_id == target_id),
                (Friendship.user_id == target_id)
                & (Friendship.friend_id == viewer_id),
            ),
        )
    )
    return result.scalar_one_or_none() is not None


async def _profile_preferences(
    user_id: int, db: AsyncSession
) -> list[MusicPreferenceRead]:
    result = await db.execute(
        select(UserMusicPreference)
        .where(UserMusicPreference.user_id == user_id)
        .order_by(UserMusicPreference.preference_type, UserMusicPreference.preference_value)
    )
    return [
        MusicPreferenceRead(
            preference_type=preference.preference_type,
            preference_value=preference.preference_value,
        )
        for preference in result.scalars()
    ]


def _profile_response(
    user: User,
    preferences: list[MusicPreferenceRead],
    *,
    is_self: bool,
    is_friend: bool,
) -> ProfileRead:
    can_see_friends = is_self or is_friend
    return ProfileRead(
        id=user.id,
        public_name=user.public_name,
        bio=(
            user.bio
            if is_self
            or user.bio_visibility == VisibilityLevel.PUBLIC
            or (user.bio_visibility == VisibilityLevel.FRIENDS and can_see_friends)
            else None
        ),
        birthdate=(
            user.birthdate
            if is_self
            or user.birthdate_visibility == VisibilityLevel.PUBLIC
            or (
                user.birthdate_visibility == VisibilityLevel.FRIENDS
                and can_see_friends
            )
            else None
        ),
        bio_visibility=user.bio_visibility,
        birthdate_visibility=user.birthdate_visibility,
        music_preferences_visibility=user.music_preferences_visibility,
        music_preferences=(
            preferences
            if is_self
            or user.music_preferences_visibility == VisibilityLevel.PUBLIC
            or (
                user.music_preferences_visibility == VisibilityLevel.FRIENDS
                and can_see_friends
            )
            else []
        ),
    )


@router.get("/me/profile", response_model=ProfileRead)
async def read_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileRead:
    preferences = await _profile_preferences(current_user.id, db)
    return _profile_response(
        current_user, preferences, is_self=True, is_friend=True
    )


@router.patch("/me/profile", response_model=ProfileRead)
async def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileRead:
    updates = payload.model_dump(
        exclude_unset=True, exclude={"music_preferences"}
    )
    if "public_name" in updates and not updates["public_name"].strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Public name cannot be empty",
        )
    if "bio" in updates and updates["bio"] is not None:
        updates["bio"] = updates["bio"].strip() or None
    for field, value in updates.items():
        setattr(current_user, field, value)

    if payload.music_preferences is not None:
        await db.execute(
            delete(UserMusicPreference).where(
                UserMusicPreference.user_id == current_user.id
            )
        )
        seen_preferences: set[tuple[PreferenceType, str]] = set()
        for preference in payload.music_preferences:
            value = preference.preference_value.strip()
            key = (preference.preference_type, value)
            if not value or key in seen_preferences:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Music preferences must contain unique non-empty values",
                )
            seen_preferences.add(key)
            db.add(
                UserMusicPreference(
                    user_id=current_user.id,
                    preference_type=preference.preference_type,
                    preference_value=value,
                )
            )

    await db.commit()
    await db.refresh(current_user)
    preferences = await _profile_preferences(current_user.id, db)
    return _profile_response(
        current_user, preferences, is_self=True, is_friend=True
    )


@router.get("/{user_id}/profile", response_model=ProfileRead)
async def read_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileRead:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    is_self = current_user.id == user.id
    is_friend = await _is_friend(current_user.id, user.id, db)
    preferences = await _profile_preferences(user.id, db)
    return _profile_response(
        user, preferences, is_self=is_self, is_friend=is_friend
    )
