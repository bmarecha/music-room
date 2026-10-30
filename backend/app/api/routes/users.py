from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import (
    Friendship,
    FriendshipStatus,
    PreferenceType,
    User,
    UserMusicPreference,
    VisibilityLevel,
)
from app.schemas.user import (
    FriendInviteCreate,
    FriendInviteRead,
    FriendRead,
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
            Friendship.status == FriendshipStatus.ACCEPTED,
            or_(
                (Friendship.user_id == viewer_id)
                & (Friendship.friend_id == target_id),
                (Friendship.user_id == target_id)
                & (Friendship.friend_id == viewer_id),
            ),
        )
    )
    return result.scalars().first() is not None


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
    is_friend: bool = False,
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
        friends_visibility=user.friends_visibility,
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
        current_user, preferences, is_self=True
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


async def _get_user_friends(user_id: int, db: AsyncSession) -> list[FriendRead]:
    query = (
        select(User)
        .join(
            Friendship,
            or_(
                (Friendship.user_id == user_id) & (Friendship.friend_id == User.id),
                (Friendship.friend_id == user_id) & (Friendship.user_id == User.id),
            ),
        )
        .where(Friendship.status == FriendshipStatus.ACCEPTED)
        .order_by(User.public_name)
    )
    result = await db.execute(query)
    friends = result.scalars().all()
    return [
        FriendRead(
            id=friend.id,
            public_name=friend.public_name,
            bio=friend.bio,
        )
        for friend in friends
    ]


@router.get("/me/friends", response_model=list[FriendRead])
async def read_my_friends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FriendRead]:
    """Retrieve accepted friends of the current user."""
    return await _get_user_friends(current_user.id, db)


@router.delete("/me/friends/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_friend(
    friend_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete an accepted friendship with another user."""
    result = await db.execute(
        delete(Friendship).where(
            Friendship.status == FriendshipStatus.ACCEPTED,
            or_(
                (Friendship.user_id == current_user.id)
                & (Friendship.friend_id == friend_id),
                (Friendship.friend_id == current_user.id)
                & (Friendship.user_id == friend_id),
            ),
        )
    )
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend not found",
        )
    await db.commit()


@router.get("/{user_id}/friends", response_model=list[FriendRead])
async def read_user_friends(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FriendRead]:
    """Retrieve accepted friends of a target user, respecting friends_visibility."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    is_self = current_user.id == user.id
    if is_self or user.friends_visibility == VisibilityLevel.PUBLIC:
        return await _get_user_friends(user.id, db)

    is_friend = await _is_friend(current_user.id, user.id, db)
    if user.friends_visibility == VisibilityLevel.FRIENDS and is_friend:
        return await _get_user_friends(user.id, db)

    return []


@router.get("/me/invites", response_model=list[FriendInviteRead])
async def read_my_invites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FriendInviteRead]:
    """Retrieve all pending invites sent and received by the current user."""
    sent_query = (
        select(Friendship, User)
        .join(User, Friendship.friend_id == User.id)
        .where(
            Friendship.user_id == current_user.id,
            Friendship.status == FriendshipStatus.PENDING,
        )
        .order_by(User.public_name)
    )
    sent_result = await db.execute(sent_query)
    invites: list[FriendInviteRead] = [
        FriendInviteRead(
            other_user_id=target_user.id,
            other_user_name=target_user.public_name,
            direction="sent",
            status="pending",
        )
        for _, target_user in sent_result.all()
    ]

    received_query = (
        select(Friendship, User)
        .join(User, Friendship.user_id == User.id)
        .where(
            Friendship.friend_id == current_user.id,
            Friendship.status == FriendshipStatus.PENDING,
        )
        .order_by(User.public_name)
    )
    received_result = await db.execute(received_query)
    for _, sender_user in received_result.all():
        invites.append(
            FriendInviteRead(
                other_user_id=sender_user.id,
                other_user_name=sender_user.public_name,
                direction="received",
                status="pending",
            )
        )

    return invites


@router.post(
    "/me/invites",
    response_model=FriendInviteRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_invite(
    payload: FriendInviteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FriendInviteRead:
    """Send a friend invite to another user by pseudonym (public_name) or email."""
    identifier = payload.public_name.strip()
    target: User | None = None

    if "@" in identifier:
        target_result = await db.execute(
            select(User).where(func.lower(User.email) == identifier.lower())
        )
        target = target_result.scalars().first()
    else:
        target_result = await db.execute(
            select(User).where(User.public_name == identifier)
        )
        targets = target_result.scalars().all()
        if len(targets) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plusieurs utilisateurs partagent ce pseudonyme. Veuillez utiliser leur adresse email.",
            )
        if len(targets) == 1:
            target = targets[0]
        else:
            target_result = await db.execute(
                select(User).where(func.lower(User.email) == identifier.lower())
            )
            target = target_result.scalars().first()

    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable",
        )
    if target.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite yourself",
        )

    existing_result = await db.execute(
        select(Friendship).where(
            or_(
                (Friendship.user_id == current_user.id)
                & (Friendship.friend_id == target.id),
                (Friendship.user_id == target.id)
                & (Friendship.friend_id == current_user.id),
            )
        )
    )
    existing = existing_result.scalars().first()
    if existing is not None:
        if existing.status == FriendshipStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already friends",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite already pending",
        )

    friendship = Friendship(
        user_id=current_user.id,
        friend_id=target.id,
        status=FriendshipStatus.PENDING,
    )
    db.add(friendship)
    await db.commit()

    return FriendInviteRead(
        other_user_id=target.id,
        other_user_name=target.public_name,
        direction="sent",
        status="pending",
    )


@router.post(
    "/me/invites/{other_user_id}/accept",
    response_model=FriendRead,
)
async def accept_invite(
    other_user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FriendRead:
    """Accept an incoming friend invite."""
    result = await db.execute(
        select(Friendship).where(
            Friendship.user_id == other_user_id,
            Friendship.friend_id == current_user.id,
            Friendship.status == FriendshipStatus.PENDING,
        )
    )
    friendship = result.scalars().first()
    if friendship is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found",
        )

    friendship.status = FriendshipStatus.ACCEPTED
    await db.commit()

    sender_result = await db.execute(select(User).where(User.id == other_user_id))
    sender = sender_result.scalars().first()
    if sender is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return FriendRead(
        id=sender.id,
        public_name=sender.public_name,
        bio=sender.bio,
    )


@router.delete(
    "/me/invites/{other_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_invite(
    other_user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Cancel a sent invite or reject a received invite."""
    result = await db.execute(
        delete(Friendship).where(
            Friendship.status == FriendshipStatus.PENDING,
            or_(
                (Friendship.user_id == current_user.id)
                & (Friendship.friend_id == other_user_id),
                (Friendship.friend_id == current_user.id)
                & (Friendship.user_id == other_user_id),
            ),
        )
    )
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found",
        )
    await db.commit()
