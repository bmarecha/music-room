from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.playlist import (
    PlaylistCollaboratorRole,
    PlaylistLicenseRestriction,
    PlaylistVisibility,
)
from app.schemas.track import TrackCreate


class PlaylistCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    visibility: PlaylistVisibility = PlaylistVisibility.public
    license_restriction: PlaylistLicenseRestriction = PlaylistLicenseRestriction.everyone_edit


class PlaylistUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    visibility: PlaylistVisibility | None = None
    license_restriction: PlaylistLicenseRestriction | None = None


class PlaylistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    creator_id: int
    title: str
    visibility: PlaylistVisibility
    license_restriction: PlaylistLicenseRestriction
    created_at: datetime


class PlaylistCollaboratorCreate(BaseModel):
    user_id: int
    role: PlaylistCollaboratorRole = PlaylistCollaboratorRole.editor


class PlaylistCollaboratorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    playlist_id: int
    user_id: int
    role: PlaylistCollaboratorRole


class PlaylistTrackCreate(BaseModel):
    track_id: str = Field(max_length=50)
    position: int | None = Field(default=None, ge=0)  # None = append at the end
    # Metadata of the track, required the first time a track is used
    track: TrackCreate | None = None


class PlaylistTrackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    playlist_id: int
    track_id: str
    position: int
    added_by: int | None
    added_at: datetime
