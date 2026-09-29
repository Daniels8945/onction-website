from sqlalchemy import inspect, text
from sqlmodel import SQLModel, create_engine, Session

from .config import get_settings

settings = get_settings()
DATABASE_URL = settings.database_url

# SQLite needs check_same_thread=False for use with FastAPI's threaded
# request handling; Postgres (used on the VPS in production) doesn't.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)

# Columns added to already-existing tables after their first deploy.
# `create_all()` only creates missing *tables*, never alters existing ones —
# there's no migrations framework here yet, so new columns on tables that
# already have rows need this small, idempotent ADD COLUMN step instead.
# Safe to run on every startup: each entry is skipped once the column exists.
_NEW_COLUMNS: dict[str, list[tuple[str, str]]] = {
    "pageview": [
        ("session_id", "VARCHAR(100)"),
        ("utm_source", "VARCHAR(200)"),
        ("utm_medium", "VARCHAR(200)"),
        ("utm_campaign", "VARCHAR(200)"),
        ("utm_term", "VARCHAR(200)"),
        ("utm_content", "VARCHAR(200)"),
        ("referrer_category", "VARCHAR(20)"),
        ("country", "VARCHAR(100)"),
    ],
    "enquiry": [
        ("utm_source", "VARCHAR(200)"),
        ("utm_medium", "VARCHAR(200)"),
        ("utm_campaign", "VARCHAR(200)"),
        ("referrer_category", "VARCHAR(20)"),
    ],
    "registration": [
        ("utm_source", "VARCHAR(200)"),
        ("utm_medium", "VARCHAR(200)"),
        ("utm_campaign", "VARCHAR(200)"),
        ("referrer_category", "VARCHAR(20)"),
    ],
    "adminuser": [
        # Defaults every existing admin to "Super Admin" so the new vendor-platform
        # role gate (see security.require_role) doesn't lock anyone out on upgrade.
        ("role", "VARCHAR(20) DEFAULT 'Super Admin'"),
        ("reset_token", "VARCHAR(200)"),
        ("reset_expires", "TIMESTAMP"),
    ],
}


def _add_missing_columns() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, columns in _NEW_COLUMNS.items():
            if table not in existing_tables:
                continue  # brand-new DB — create_all() already added it with every column
            existing_columns = {c["name"] for c in inspector.get_columns(table)}
            for name, coltype in columns:
                if name in existing_columns:
                    continue
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {coltype}"))


def init_db() -> None:
    """Create tables if they don't exist yet, then patch in any columns
    added since existing tables were first created."""
    SQLModel.metadata.create_all(engine)
    _add_missing_columns()


def get_session():
    """FastAPI dependency that yields a database session."""
    with Session(engine) as session:
        yield session
