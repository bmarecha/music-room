from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.event import (
    EventInvitationStatus,
    EventLicenseRestriction,
    EventVisibility,
)
from app.schemas.track import TrackCreate, TrackRead


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    visibility: EventVisibility = EventVisibility.public
    license_restriction: EventLicenseRestriction = EventLicenseRestriction.everyone
    # Only used with license_restriction == location_time_restricted
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    geo_radius_meters: int | None = Field(default=None, gt=0)
    start_time: datetime | None = None
    end_time: datetime | None = None


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    visibility: EventVisibility | None = None
    license_restriction: EventLicenseRestriction | None = None
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    geo_radius_meters: int | None = Field(default=None, gt=0)
    start_time: datetime | None = None
    end_time: datetime | None = None


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    host_id: int
    title: str
    visibility: EventVisibility
    license_restriction: EventLicenseRestriction
    latitude: Decimal | None
    longitude: Decimal | None
    geo_radius_meters: int | None
    start_time: datetime | None
    end_time: datetime | None


class EventInvitationCreate(BaseModel):
    user_id: int


class EventInvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: int
    user_id: int
    status: EventInvitationStatus
    invited_at: datetime


class EventVoteCreate(BaseModel):
    track_id: str = Field(max_length=50)
    vote_value: int = Field(default=1, ge=-1, le=1)
    # Metadata of the track, required the first time a track is voted on
    track: TrackCreate | None = None


class EventVoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: int
    track_id: str
    user_id: int
    vote_value: int
    voted_at: datetime


class TrackScore(BaseModel):
    track: TrackRead
    score: int
