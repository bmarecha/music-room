import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PlaylistVisibility(str, enum.Enum):
    public = "public"
    private = "private"


class PlaylistLicenseRestriction(str, enum.Enum):
    everyone_edit = "everyone_edit"
    invited_only_edit = "invited_only_edit"


class PlaylistCollaboratorRole(str, enum.Enum):
    viewer = "viewer"
    editor = "editor"


def _values(enum_cls: type[enum.Enum]) -> list[str]:
    return [member.value for member in enum_cls]


class Playlist(Base):
    __tablename__ = "playlists"

    id: Mapped[int] = mapped_column(primary_key=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    visibility: Mapped[PlaylistVisibility] = mapped_column(
        SAEnum(PlaylistVisibility, name="playlist_visibility", values_callable=_values),
        server_default=text("'public'"),
    )
    license_restriction: Mapped[PlaylistLicenseRestriction] = mapped_column(
        SAEnum(
            PlaylistLicenseRestriction,
            name="playlist_license_restriction",
            values_callable=_values,
        ),
        server_default=text("'everyone_edit'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PlaylistCollaborator(Base):
    __tablename__ = "playlist_collaborators"

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[PlaylistCollaboratorRole] = mapped_column(
        SAEnum(
            PlaylistCollaboratorRole,
            name="playlist_collaborator_role",
            values_callable=_values,
        ),
        server_default=text("'editor'"),
    )


class PlaylistTrack(Base):
    __tablename__ = "playlist_tracks"

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True
    )
    track_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int]
    added_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
