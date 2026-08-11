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


def init_db() -> None:
    """Create tables if they don't exist yet."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency that yields a database session."""
    with Session(engine) as session:
        yield session
