from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = "dev-only-insecure-secret-change-me"
DEV_ADMIN_PASSWORD = "change-me-immediately"


class Settings(BaseSettings):
    """Central app configuration, sourced from environment variables / .env.

    Every field has a safe local-dev default so `uvicorn app.main:app --reload`
    keeps working out of the box. For production (the VPS), override via a
    real .env file or systemd/Docker environment — see backend/README.md.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Database ---------------------------------------------------------
    # Local dev: sqlite file. Production: postgresql+psycopg://user:pass@host/db
    database_url: str = "sqlite:///./onction.db"

    # --- Auth ---------------------------------------------------------------
    # MUST be overridden in production (openssl rand -hex 32).
    jwt_secret: str = DEV_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 12  # 12h admin session

    # Bootstrap admin — used by `python -m app.seed` to create the first
    # dashboard login if no admin user exists yet.
    admin_email: str = "admin@onctionenergy.com"
    admin_password: str = DEV_ADMIN_PASSWORD

    # --- Object storage (Contabo Object Storage / any S3-compatible) -------
    s3_endpoint_url: str = ""  # e.g. https://usc1.contabostorage.com
    s3_region: str = "us-central-1"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = ""
    # Public base URL to serve uploaded files from (bucket public read, or a
    # CDN/reverse proxy in front of it), e.g. https://media.onctionenergy.com
    s3_public_base_url: str = ""

    # --- CORS ---------------------------------------------------------------
    # Comma-separated extra origins allowed to call the API in production.
    extra_cors_origins: str = ""

    # --- Email (SMTP) ---------------------------------------------------------
    # Deliberately provider-agnostic: plain SMTP works against a VPS mail
    # server today, and against Amazon SES / SendGrid / Mailgun's SMTP relays
    # unchanged later if deliverability becomes an issue — just swap host/
    # user/password, no code changes.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    smtp_from_email: str = "no-reply@onctionenergy.com"
    smtp_from_name: str = "Onction Energy"
    # Where new-enquiry / new-registration notifications go. Defaults to admin_email.
    alert_email: str = ""
    # Public site origin, used to build links in emails (unsubscribe, event pages).
    public_site_url: str = "http://localhost:5173"
    # The vendor portal's own origin (served from vendors.<domain>, a separate
    # subdomain from the main site — see Caddyfile), used to build links in
    # vendor-facing emails (password reset). Kept separate from public_site_url
    # since the two point at different hosts.
    vendor_portal_url: str = "http://localhost:8080"

    @property
    def is_local_dev(self) -> bool:
        return self.database_url.startswith("sqlite")

    @model_validator(mode="after")
    def _require_real_jwt_secret(self):
        # An empty secret (e.g. docker-compose passing a blank JWT_SECRET through)
        # would let anyone forge admin tokens — never start like that. Outside
        # local SQLite dev, the dev default and short secrets are refused too.
        if not self.jwt_secret:
            raise ValueError("JWT_SECRET is empty — set it in .env (openssl rand -hex 32)")
        if not self.is_local_dev and (self.jwt_secret == DEV_JWT_SECRET or len(self.jwt_secret) < 32):
            raise ValueError("JWT_SECRET must be a random value of at least 32 characters in production (openssl rand -hex 32)")
        return self

    @property
    def resolved_alert_email(self) -> str:
        return self.alert_email or self.admin_email

    @property
    def cors_origins(self) -> list[str]:
        base = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        extras = [o.strip() for o in self.extra_cors_origins.split(",") if o.strip()]
        return base + extras


@lru_cache
def get_settings() -> Settings:
    return Settings()
