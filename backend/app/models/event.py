import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EventVisibility(str, enum.Enum):
    public = "public"
    private = "private"


class EventLicenseRestriction(str, enum.Enum):
    everyone = "everyone"
    invited_only = "invited_only"
    location_time_restricted = "location_time_restricted"


class EventInvitationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


def _values(enum_cls: type[enum.Enum]) -> list[str]:
    return [member.value for member in enum_cls]


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    visibility: Mapped[EventVisibility] = mapped_column(
        SAEnum(EventVisibility, name="event_visibility", values_callable=_values),
        server_default=text("'public'"),
    )
    license_restriction: Mapped[EventLicenseRestriction] = mapped_column(
        SAEnum(
            EventLicenseRestriction,
            name="event_license_restriction",
            values_callable=_values,
        ),
        server_default=text("'everyone'"),
    )
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(precision=9, scale=6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(precision=9, scale=6))
    geo_radius_meters: Mapped[int | None]
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EventInvitation(Base):
    __tablename__ = "event_invitations"

    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[EventInvitationStatus] = mapped_column(
        SAEnum(
            EventInvitationStatus,
            name="event_invitation_status",
            values_callable=_values,
        ),
        server_default=text("'pending'"),
    )
    invited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class EventVote(Base):
    __tablename__ = "event_votes"

    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    track_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    vote_value: Mapped[int] = mapped_column(Integer, server_default=text("1"))
    voted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
