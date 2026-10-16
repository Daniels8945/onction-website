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
        # analytics v2
        ("event_id", "VARCHAR(64)"),
        ("visitor_id", "VARCHAR(64)"),
        ("host", "VARCHAR(100)"),
        ("known_route", "BOOLEAN"),
        ("referrer_domain", "VARCHAR(200)"),
        ("device", "VARCHAR(10)"),
        ("browser", "VARCHAR(40)"),
        ("os", "VARCHAR(40)"),
        ("viewport", "VARCHAR(4)"),
        ("engaged_ms", "INTEGER"),
    ],
    "enquiry": [
        ("session_id", "VARCHAR(100)"),
        ("landing_path", "VARCHAR(200)"),
        ("client_ref", "VARCHAR(64)"),
        ("utm_source", "VARCHAR(200)"),
        ("utm_medium", "VARCHAR(200)"),
        ("utm_campaign", "VARCHAR(200)"),
        ("referrer_category", "VARCHAR(20)"),
    ],
    "registration": [
        ("session_id", "VARCHAR(100)"),
        ("landing_path", "VARCHAR(200)"),
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


# Indexes on columns added later (create_all only indexes new tables).
_NEW_INDEXES = [
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_pageview_event_id ON pageview (event_id)",
    "CREATE INDEX IF NOT EXISTS ix_pageview_visitor_id ON pageview (visitor_id)",
    "CREATE INDEX IF NOT EXISTS ix_pageview_session_created ON pageview (session_id, created_at)",
    "CREATE INDEX IF NOT EXISTS ix_enquiry_session_id ON enquiry (session_id)",
    "CREATE INDEX IF NOT EXISTS ix_enquiry_client_ref ON enquiry (client_ref)",
    "CREATE INDEX IF NOT EXISTS ix_registration_session_id ON registration (session_id)",
]


def _add_missing_indexes() -> None:
    with engine.begin() as conn:
        for stmt in _NEW_INDEXES:
            conn.execute(text(stmt))


def init_db() -> None:
    """Create tables if they don't exist yet, then patch in any columns
    added since existing tables were first created."""
    SQLModel.metadata.create_all(engine)
    _add_missing_columns()
    _add_missing_indexes()


def get_session():
    """FastAPI dependency that yields a database session."""
    with Session(engine) as session:
        yield session
