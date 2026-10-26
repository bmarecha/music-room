"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-26

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Enum types definition
visibility_level = postgresql.ENUM(
    "public", "friends", "private", name="visibility_level"
)
subscription_type = postgresql.ENUM(
    "free", "paid", name="subscription_type"
)
friendship_status = postgresql.ENUM(
    "pending", "accepted", name="friendship_status"
)
preference_type = postgresql.ENUM(
    "genre", "artist", name="preference_type"
)
event_visibility = postgresql.ENUM(
    "public", "private", name="event_visibility"
)
event_license_restriction = postgresql.ENUM(
    "everyone", "invited_only", "location_time_restricted", name="event_license_restriction"
)
event_invitation_status = postgresql.ENUM(
    "pending", "accepted", "declined", name="event_invitation_status"
)
playlist_visibility = postgresql.ENUM(
    "public", "private", name="playlist_visibility"
)
playlist_license_restriction = postgresql.ENUM(
    "everyone_edit", "invited_only_edit", name="playlist_license_restriction"
)
playlist_collaborator_role = postgresql.ENUM(
    "viewer", "editor", name="playlist_collaborator_role"
)

ENUMS = [
    visibility_level,
    subscription_type,
    friendship_status,
    preference_type,
    event_visibility,
    event_license_restriction,
    event_invitation_status,
    playlist_visibility,
    playlist_license_restriction,
    playlist_collaborator_role,
]

# Column references with create_type=False so op.create_table does not re-create them
visibility_level_col = postgresql.ENUM(
    "public", "friends", "private", name="visibility_level", create_type=False
)
subscription_type_col = postgresql.ENUM(
    "free", "paid", name="subscription_type", create_type=False
)
friendship_status_col = postgresql.ENUM(
    "pending", "accepted", name="friendship_status", create_type=False
)
preference_type_col = postgresql.ENUM(
    "genre", "artist", name="preference_type", create_type=False
)
event_visibility_col = postgresql.ENUM(
    "public", "private", name="event_visibility", create_type=False
)
event_license_restriction_col = postgresql.ENUM(
    "everyone", "invited_only", "location_time_restricted", name="event_license_restriction", create_type=False
)
event_invitation_status_col = postgresql.ENUM(
    "pending", "accepted", "declined", name="event_invitation_status", create_type=False
)
playlist_visibility_col = postgresql.ENUM(
    "public", "private", name="playlist_visibility", create_type=False
)
playlist_license_restriction_col = postgresql.ENUM(
    "everyone_edit", "invited_only_edit", name="playlist_license_restriction", create_type=False
)
playlist_collaborator_role_col = postgresql.ENUM(
    "viewer", "editor", name="playlist_collaborator_role", create_type=False
)


def upgrade() -> None:
    # 1. TYPES & ENUMS
    for enum in ENUMS:
        enum.create(op.get_bind(), checkfirst=True)

    # 2. INDEPENDENT TABLES
    op.create_table(
        "tracks",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("artist", sa.String(255), nullable=False),
        sa.Column("album", sa.String(255), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), unique=True, nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("google_id", sa.String(255), unique=True, nullable=True),
        sa.Column("is_email_validated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("public_name", sa.String(100), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("birthdate", sa.Date(), nullable=True),
        sa.Column("bio_visibility", visibility_level_col, nullable=False, server_default=sa.text("'friends'")),
        sa.Column("birthdate_visibility", visibility_level_col, nullable=False, server_default=sa.text("'private'")),
        sa.Column("music_preferences_visibility", visibility_level_col, nullable=False, server_default=sa.text("'public'")),
        sa.Column("subscription_type", subscription_type_col, nullable=False, server_default=sa.text("'free'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3. USER RELATION TABLES
    op.create_table(
        "friendships",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("friend_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("status", friendship_status_col, nullable=False, server_default=sa.text("'pending'")),
        sa.PrimaryKeyConstraint("user_id", "friend_id"),
    )

    op.create_table(
        "user_music_preferences",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("preference_type", preference_type_col, primary_key=True, nullable=False),
        sa.Column("preference_value", sa.String(100), primary_key=True, nullable=False),
        sa.PrimaryKeyConstraint("user_id", "preference_type", "preference_value"),
    )

    # 4. TRACK VOTE (Section 2.1)
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("host_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("visibility", event_visibility_col, nullable=False, server_default=sa.text("'public'")),
        sa.Column("license_restriction", event_license_restriction_col, nullable=False, server_default=sa.text("'everyone'")),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("geo_radius_meters", sa.Integer(), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "event_invitations",
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("status", event_invitation_status_col, nullable=False, server_default=sa.text("'pending'")),
        sa.Column("invited_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("event_id", "user_id"),
    )

    op.create_table(
        "event_votes",
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("track_id", sa.String(50), sa.ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("vote_value", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("voted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("event_id", "track_id", "user_id"),
    )

    # 5. PLAYLIST EDITOR (Section 2.3)
    op.create_table(
        "playlists",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("creator_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("visibility", playlist_visibility_col, nullable=False, server_default=sa.text("'public'")),
        sa.Column("license_restriction", playlist_license_restriction_col, nullable=False, server_default=sa.text("'everyone_edit'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "playlist_collaborators",
        sa.Column("playlist_id", sa.Integer(), sa.ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("role", playlist_collaborator_role_col, nullable=False, server_default=sa.text("'editor'")),
        sa.PrimaryKeyConstraint("playlist_id", "user_id"),
    )

    op.create_table(
        "playlist_tracks",
        sa.Column("playlist_id", sa.Integer(), sa.ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("track_id", sa.String(50), sa.ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("added_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("playlist_id", "track_id"),
    )


def downgrade() -> None:
    # 5. PLAYLIST EDITOR
    op.drop_table("playlist_tracks")
    op.drop_table("playlist_collaborators")
    op.drop_table("playlists")

    # 4. TRACK VOTE
    op.drop_table("event_votes")
    op.drop_table("event_invitations")
    op.drop_table("events")

    # 3. USER RELATIONS
    op.drop_table("user_music_preferences")
    op.drop_table("friendships")

    # 2. INDEPENDENT TABLES
    op.drop_table("users")
    op.drop_table("tracks")

    # 1. TYPES & ENUMS
    for enum in reversed(ENUMS):
        enum.drop(op.get_bind(), checkfirst=True)
