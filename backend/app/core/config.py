from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    project_name: str = "Music Room API"
    api_v1_prefix: str = "/api/v1"

    postgres_user: str = "musicroom"
    postgres_password: str = "musicroom"
    postgres_db: str = "musicroom"
    postgres_host: str = "db"
    postgres_port: int = 5432

    secret_key: str = "change-me"
    cors_origins: list[str] = ["*"]

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
