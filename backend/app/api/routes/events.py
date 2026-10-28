from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.db.session import get_db
from app.models.event import Event, EventVote
from app.models.track import Track
from app.schemas.event import (
    EventCreate,
    EventRead,
    EventVoteCreate,
    EventVoteRead,
    TrackScore,
)

router = APIRouter(prefix="/events", tags=["track-vote"])

# TODO: invitations, and the access rules (visibility, license, location + time window).


async def get_event_or_404(db: AsyncSession, event_id: int) -> Event:
    event = await db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    return event


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Event:
    event = Event(host_id=user_id, **data.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("", response_model=list[EventRead])
async def list_events(db: AsyncSession = Depends(get_db)) -> list[Event]:
    result = await db.execute(select(Event).order_by(Event.id))
    return list(result.scalars().all())


@router.get("/{event_id}", response_model=EventRead)
async def read_event(event_id: int, db: AsyncSession = Depends(get_db)) -> Event:
    return await get_event_or_404(db, event_id)


@router.post(
    "/{event_id}/votes",
    response_model=EventVoteRead,
    status_code=status.HTTP_201_CREATED,
)
async def vote(
    event_id: int,
    data: EventVoteCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> EventVote:
    await get_event_or_404(db, event_id)

    if data.track is not None:
        if data.track.id != data.track_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "track.id must match track_id")
        # Atomic: two users voting on a new track at the same time cannot collide.
        await db.execute(
            insert(Track)
            .values(**data.track.model_dump())
            .on_conflict_do_nothing(index_elements=["id"])
        )
    elif await db.get(Track, data.track_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown track: send its metadata in 'track'")

    # Atomic upsert: one row per (event, track, user), a new vote replaces the previous one.
    stmt = (
        insert(EventVote)
        .values(
            event_id=event_id,
            track_id=data.track_id,
            user_id=user_id,
            vote_value=data.vote_value,
        )
        .on_conflict_do_update(
            index_elements=["event_id", "track_id", "user_id"],
            set_={"vote_value": data.vote_value, "voted_at": func.now()},
        )
        .returning(EventVote)
    )
    result = await db.execute(stmt)
    event_vote = result.scalar_one()
    await db.commit()
    return event_vote


@router.get("/{event_id}/tracks", response_model=list[TrackScore])
async def ranking(event_id: int, db: AsyncSession = Depends(get_db)) -> list[TrackScore]:
    await get_event_or_404(db, event_id)

    # The score is computed on read, so concurrent votes can never corrupt it.
    score = func.sum(EventVote.vote_value)
    result = await db.execute(
        select(Track, score)
        .join(EventVote, EventVote.track_id == Track.id)
        .where(EventVote.event_id == event_id)
        .group_by(Track.id)
        .order_by(score.desc(), func.min(EventVote.voted_at), Track.id)
    )
    return [TrackScore(track=track, score=total) for track, total in result.all()]
