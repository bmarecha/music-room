from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import SubscriptionType, VisibilityLevel


class UserBase(BaseModel):
    email: EmailStr | None = None
    public_name: str
    bio: str | None = None
    birthdate: date | None = None
    bio_visibility: VisibilityLevel = VisibilityLevel.FRIENDS
    birthdate_visibility: VisibilityLevel = VisibilityLevel.PRIVATE
    music_preferences_visibility: VisibilityLevel = VisibilityLevel.PUBLIC
    subscription_type: SubscriptionType = SubscriptionType.FREE


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    google_id: str | None = None
    is_email_validated: bool
    created_at: datetime
