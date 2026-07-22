"""Application settings, loaded from environment (pydantic-settings)."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "dev"

    # --- Database ---
    postgres_user: str = "nexkara"
    postgres_password: str = "nexkara_dev_pw"
    postgres_db: str = "nexkara"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    # Explicit override (used by tests to point at sqlite). Empty -> build from parts.
    database_url: str = ""

    # --- Redis ---
    redis_url: str = "redis://redis:6379/0"

    # --- Auth / tokens ---
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    session_ttl_minutes: int = 60
    device_trust_days: int = 30
    otp_ttl_seconds: int = 600
    otp_resend_cooldown_seconds: int = 30
    otp_max_attempts: int = 5

    # --- Cookies ---
    cookie_secure: bool = False
    cookie_domain: str | None = None
    frontend_origin: str = "http://localhost:3000"

    # --- Seed admin ---
    seed_admin_email: str = "alex.rivera@nexkara.com"
    seed_admin_name: str = "Alex Rivera"
    seed_admin_password: str = "Password123!"

    # --- Mail ---
    mail_backend: str = "console"  # console | smtp
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    mail_from: str = "no-reply@nexkara.com"

    # --- Object storage ---
    # "minio" for the S3-compatible service (docker-compose), or "local" for a
    # filesystem backend so you can run the API without MinIO in dev.
    storage_backend: str = "minio"  # minio | local
    local_storage_dir: str = "./storage_data"

    # --- MinIO / S3 ---
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "nexkara"
    minio_secret_key: str = "nexkara_dev_pw"
    minio_bucket: str = "prototypes"
    minio_secure: bool = False
    minio_public_endpoint: str = ""  # browser-facing host for presigned URLs

    # --- Uploads ---
    max_upload_bytes: int = 5 * 1024 * 1024  # 5 MB

    @property
    def async_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def session_cookie_name(self) -> str:
        return "nx_session"

    @property
    def trust_cookie_name(self) -> str:
        return "nx_trust"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
