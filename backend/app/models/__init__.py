# Import every model here so Alembic autogenerate can see it.
from app.models.event import Event, EventInvitation, EventVote
from app.models.playlist import Playlist, PlaylistCollaborator, PlaylistTrack
from app.models.track import Track
from app.models.user import Friendship, User, UserMusicPreference

__all__ = [
    "Event",
    "EventInvitation",
    "EventVote",
    "Friendship",
    "Playlist",
    "PlaylistCollaborator",
    "PlaylistTrack",
    "Track",
    "User",
    "UserMusicPreference",
]
