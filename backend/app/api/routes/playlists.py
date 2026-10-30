from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.playlist import (
    Playlist,
    PlaylistCollaborator,
    PlaylistCollaboratorRole,
    PlaylistLicenseRestriction,
    PlaylistTrack,
    PlaylistVisibility,
)
from app.models.track import Track
from app.models.user import User
from app.schemas.playlist import (
    PlaylistCollaboratorCreate,
    PlaylistCollaboratorRead,
    PlaylistCreate,
    PlaylistRead,
    PlaylistTrackCreate,
    PlaylistTrackRead,
    PlaylistUpdate,
)

router = APIRouter(prefix="/playlists", tags=["playlist-editor"])

# TODO: real-time reordering over WebSockets, move a track to another position.


async def get_collaborator_role(
    db: AsyncSession, playlist_id: int, user_id: int
) -> PlaylistCollaboratorRole | None:
    return await db.scalar(
        select(PlaylistCollaborator.role).where(
            PlaylistCollaborator.playlist_id == playlist_id,
            PlaylistCollaborator.user_id == user_id,
        )
    )


async def can_view(db: AsyncSession, playlist: Playlist, user_id: int) -> bool:
    if playlist.visibility == PlaylistVisibility.public or playlist.creator_id == user_id:
        return True
    return await get_collaborator_role(db, playlist.id, user_id) is not None


async def can_edit(db: AsyncSession, playlist: Playlist, user_id: int) -> bool:
    if playlist.creator_id == user_id:
        return True
    role = await get_collaborator_role(db, playlist.id, user_id)
    if role == PlaylistCollaboratorRole.viewer:
        return False
    if playlist.license_restriction == PlaylistLicenseRestriction.everyone_edit:
        return True
    return role == PlaylistCollaboratorRole.editor


async def get_viewable_playlist(
    db: AsyncSession, playlist_id: int, user_id: int, *, for_update: bool = False
) -> Playlist:
    """Returns the playlist, or 404 if it does not exist or the user may not see it."""
    stmt = select(Playlist).where(Playlist.id == playlist_id)
    if for_update:
        # Serializes concurrent changes to the track list of this playlist.
        stmt = stmt.with_for_update()
    playlist = await db.scalar(stmt)
    if playlist is None or not await can_view(db, playlist, user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Playlist not found")
    return playlist


async def get_editable_playlist(
    db: AsyncSession, playlist_id: int, user_id: int, *, for_update: bool = False
) -> Playlist:
    playlist = await get_viewable_playlist(db, playlist_id, user_id, for_update=for_update)
    if not await can_edit(db, playlist, user_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot edit this playlist")
    return playlist


async def get_owned_playlist(db: AsyncSession, playlist_id: int, user_id: int) -> Playlist:
    playlist = await get_viewable_playlist(db, playlist_id, user_id)
    if playlist.creator_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the creator can do this")
    return playlist


# ---- Playlists ----


@router.post("", response_model=PlaylistRead, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    data: PlaylistCreate,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Playlist:
    playlist = Playlist(creator_id=user_id, **data.model_dump())
    db.add(playlist)
    await db.commit()
    await db.refresh(playlist)
    return playlist


@router.get("", response_model=list[PlaylistRead])
async def list_playlists(
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Playlist]:
    collaborating = select(PlaylistCollaborator.playlist_id).where(
        PlaylistCollaborator.user_id == user_id
    )
    result = await db.execute(
        select(Playlist)
        .where(
            or_(
                Playlist.visibility == PlaylistVisibility.public,
                Playlist.creator_id == user_id,
                Playlist.id.in_(collaborating),
            )
        )
        .order_by(Playlist.id)
    )
    return list(result.scalars().all())


@router.get("/{playlist_id}", response_model=PlaylistRead)
async def read_playlist(
    playlist_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Playlist:
    return await get_viewable_playlist(db, playlist_id, user.id)


@router.patch("/{playlist_id}", response_model=PlaylistRead)
async def update_playlist(
    playlist_id: int,
    data: PlaylistUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Playlist:
    playlist = await get_owned_playlist(db, playlist_id, user.id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(playlist, field, value)
    await db.commit()
    await db.refresh(playlist)
    return playlist


@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playlist(
    playlist_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    playlist = await get_owned_playlist(db, playlist_id, user.id)
    await db.delete(playlist)
    await db.commit()


# ---- Tracks of a playlist ----


@router.get("/{playlist_id}/tracks", response_model=list[PlaylistTrackRead])
async def list_playlist_tracks(
    playlist_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PlaylistTrack]:
    await get_viewable_playlist(db, playlist_id, user.id)
    result = await db.execute(
        select(PlaylistTrack)
        .where(PlaylistTrack.playlist_id == playlist_id)
        .order_by(PlaylistTrack.position)
    )
    return list(result.scalars().all())


@router.post(
    "/{playlist_id}/tracks",
    response_model=PlaylistTrackRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_playlist_track(
    playlist_id: int,
    data: PlaylistTrackCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlaylistTrack:
    # The row lock held until the commit keeps positions consistent under concurrency.
    await get_editable_playlist(db, playlist_id, user.id, for_update=True)

    if data.track is not None:
        if data.track.id != data.track_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "track.id must match track_id")
        await db.execute(
            insert(Track)
            .values(**data.track.model_dump())
            .on_conflict_do_nothing(index_elements=["id"])
        )
    elif await db.get(Track, data.track_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown track: send its metadata in 'track'")

    if await db.get(PlaylistTrack, (playlist_id, data.track_id)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Track already in the playlist")

    # Positions are contiguous, starting at 0.
    count = await db.scalar(
        select(func.count()).select_from(PlaylistTrack).where(PlaylistTrack.playlist_id == playlist_id)
    )
    position = count if data.position is None else min(data.position, count)

    await db.execute(
        update(PlaylistTrack)
        .where(PlaylistTrack.playlist_id == playlist_id, PlaylistTrack.position >= position)
        .values(position=PlaylistTrack.position + 1)
    )
    playlist_track = PlaylistTrack(
        playlist_id=playlist_id, track_id=data.track_id, position=position, added_by=user.id
    )
    db.add(playlist_track)
    await db.commit()
    await db.refresh(playlist_track)
    return playlist_track


@router.delete("/{playlist_id}/tracks/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_playlist_track(
    playlist_id: int,
    track_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await get_editable_playlist(db, playlist_id, user.id, for_update=True)

    playlist_track = await db.get(PlaylistTrack, (playlist_id, track_id))
    if playlist_track is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Track not in the playlist")

    removed_position = playlist_track.position
    await db.delete(playlist_track)
    # Close the gap so positions stay contiguous.
    await db.execute(
        update(PlaylistTrack)
        .where(PlaylistTrack.playlist_id == playlist_id, PlaylistTrack.position > removed_position)
        .values(position=PlaylistTrack.position - 1)
    )
    await db.commit()


# ---- Collaborators ----


@router.get("/{playlist_id}/collaborators", response_model=list[PlaylistCollaboratorRead])
async def list_collaborators(
    playlist_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PlaylistCollaborator]:
    await get_viewable_playlist(db, playlist_id, user.id)
    result = await db.execute(
        select(PlaylistCollaborator)
        .where(PlaylistCollaborator.playlist_id == playlist_id)
        .order_by(PlaylistCollaborator.user_id)
    )
    return list(result.scalars().all())


@router.post(
    "/{playlist_id}/collaborators",
    response_model=PlaylistCollaboratorRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_collaborator(
    playlist_id: int,
    data: PlaylistCollaboratorCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlaylistCollaborator:
    await get_owned_playlist(db, playlist_id, user.id)
    if await db.scalar(select(User.id).where(User.id == data.user_id)) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    # Adding someone twice just updates their role.
    result = await db.execute(
        insert(PlaylistCollaborator)
        .values(playlist_id=playlist_id, user_id=data.user_id, role=data.role)
        .on_conflict_do_update(
            index_elements=["playlist_id", "user_id"], set_={"role": data.role}
        )
        .returning(PlaylistCollaborator)
    )
    collaborator = result.scalar_one()
    await db.commit()
    return collaborator


@router.delete(
    "/{playlist_id}/collaborators/{collaborator_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_collaborator(
    playlist_id: int,
    collaborator_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await get_owned_playlist(db, playlist_id, user.id)
    collaborator = await db.get(PlaylistCollaborator, (playlist_id, collaborator_id))
    if collaborator is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Collaborator not found")
    await db.delete(collaborator)
    await db.commit()
