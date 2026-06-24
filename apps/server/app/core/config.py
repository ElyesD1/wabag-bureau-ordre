from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://bo_app:bo_app_pw@localhost:5432/bureau_ordre"
    jwt_secret: str = "dev-only-secret-change-me"
    jwt_access_ttl_min: int = 30
    jwt_refresh_ttl_days: int = 7
    app_version: str = "1.0.0"
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
