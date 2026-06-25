from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "bureau_ordre"
    jwt_secret: str = "dev-only-secret-change-me-please-32bytes"
    jwt_access_ttl_min: int = 30
    jwt_refresh_ttl_days: int = 7
    app_version: str = "1.0.0"
    cors_origins: str = "*"
    max_pdf_mb: int = 20
    # Optional zero-touch first admin (created on startup if the users collection
    # is empty and a password is provided). Set these in the Render dashboard.
    seed_admin_username: str = "admin"
    seed_admin_password: str = ""
    seed_admin_fullname: str = "Administrateur BO"

    @property
    def cors_list(self) -> list[str]:
        v = self.cors_origins.strip()
        if v == "*":
            return ["*"]
        return [o.strip() for o in v.split(",") if o.strip()]


settings = Settings()
