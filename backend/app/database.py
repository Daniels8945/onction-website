from sqlmodel import SQLModel, create_engine, Session

# SQLite file lives alongside the app. For production swap the URL for
# Postgres, e.g. postgresql+psycopg://user:pass@host/db
DATABASE_URL = "sqlite:///./onction.db"

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


def init_db() -> None:
    """Create tables if they don't exist yet."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency that yields a database session."""
    with Session(engine) as session:
        yield session
