from pydantic import BaseModel, ConfigDict, Field


class TrackBase(BaseModel):
    title: str = Field(max_length=255)
    artist: str = Field(max_length=255)
    album: str | None = Field(default=None, max_length=255)
    duration_ms: int = Field(gt=0)


class TrackCreate(TrackBase):
    id: str = Field(max_length=50)  # third-party provider track ID


class TrackRead(TrackBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
