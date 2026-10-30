from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import PreferenceType, SubscriptionType, VisibilityLevel


class UserBase(BaseModel):
    email: EmailStr | None = None
    public_name: str
    bio: str | None = None
    birthdate: date | None = None
    bio_visibility: VisibilityLevel = VisibilityLevel.FRIENDS
    birthdate_visibility: VisibilityLevel = VisibilityLevel.PRIVATE
    music_preferences_visibility: VisibilityLevel = VisibilityLevel.PUBLIC
    friends_visibility: VisibilityLevel = VisibilityLevel.FRIENDS
    subscription_type: SubscriptionType = SubscriptionType.FREE


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    google_id: str | None = None
    is_email_validated: bool
    created_at: datetime


class MusicPreferenceRead(BaseModel):
    preference_type: PreferenceType
    preference_value: str


class ProfileRead(BaseModel):
    id: int
    public_name: str
    bio: str | None = None
    birthdate: date | None = None
    bio_visibility: VisibilityLevel
    birthdate_visibility: VisibilityLevel
    music_preferences_visibility: VisibilityLevel
    friends_visibility: VisibilityLevel
    music_preferences: list[MusicPreferenceRead] = Field(default_factory=list)


class ProfileUpdate(BaseModel):
    public_name: str | None = Field(default=None, min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=2000)
    birthdate: date | None = None
    bio_visibility: VisibilityLevel | None = None
    birthdate_visibility: VisibilityLevel | None = None
    music_preferences_visibility: VisibilityLevel | None = None
    friends_visibility: VisibilityLevel | None = None
    music_preferences: list[MusicPreferenceRead] | None = None


class FriendRead(BaseModel):
    id: int
    public_name: str
    bio: str | None = None


class FriendInviteRead(BaseModel):
    other_user_id: int
    other_user_name: str
    direction: str
    status: str = "pending"


class FriendInviteCreate(BaseModel):
    public_name: str = Field(min_length=1, max_length=100)
