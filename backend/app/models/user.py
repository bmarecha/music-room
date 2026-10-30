import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VisibilityLevel(str, enum.Enum):
    PUBLIC = "public"
    FRIENDS = "friends"
    PRIVATE = "private"


class SubscriptionType(str, enum.Enum):
    FREE = "free"
    PAID = "paid"


class PreferenceType(str, enum.Enum):
    GENRE = "genre"
    ARTIST = "artist"


class FriendshipStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    is_email_validated: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    public_name: Mapped[str] = mapped_column(String(100), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    birthdate: Mapped[date | None] = mapped_column(Date, nullable=True)

    bio_visibility: Mapped[VisibilityLevel] = mapped_column(
        Enum(
            VisibilityLevel,
            name="visibility_level",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        default=VisibilityLevel.FRIENDS,
        server_default="friends",
    )
    birthdate_visibility: Mapped[VisibilityLevel] = mapped_column(
        Enum(
            VisibilityLevel,
            name="visibility_level",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        default=VisibilityLevel.PRIVATE,
        server_default="private",
    )
    music_preferences_visibility: Mapped[VisibilityLevel] = mapped_column(
        Enum(
            VisibilityLevel,
            name="visibility_level",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        default=VisibilityLevel.PUBLIC,
        server_default="public",
    )
    friends_visibility: Mapped[VisibilityLevel] = mapped_column(
        Enum(
            VisibilityLevel,
            name="visibility_level",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        default=VisibilityLevel.FRIENDS,
        server_default="friends",
    )

    subscription_type: Mapped[SubscriptionType] = mapped_column(
        Enum(
            SubscriptionType,
            name="subscription_type",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        default=SubscriptionType.FREE,
        server_default="free",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Friendship(Base):
    __tablename__ = "friendships"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    friend_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[FriendshipStatus] = mapped_column(
        Enum(
            FriendshipStatus,
            name="friendship_status",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=FriendshipStatus.PENDING,
        server_default="pending",
    )


class UserMusicPreference(Base):
    __tablename__ = "user_music_preferences"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    preference_type: Mapped[PreferenceType] = mapped_column(
        Enum(
            PreferenceType,
            name="preference_type",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        primary_key=True,
    )
    preference_value: Mapped[str] = mapped_column(
        String(100), primary_key=True
    )
