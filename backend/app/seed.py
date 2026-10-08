"""Creates the first dashboard admin login from ADMIN_EMAIL/ADMIN_PASSWORD
env vars, if no admin exists yet.

Usage:
    python -m app.seed
"""
from sqlmodel import Session, select

from .config import DEV_ADMIN_PASSWORD, get_settings
from .database import engine, init_db
from .models_admin import AdminUser
from .security import hash_password


def run() -> None:
    settings = get_settings()
    if not settings.is_local_dev and (settings.admin_password == DEV_ADMIN_PASSWORD or len(settings.admin_password) < 12):
        raise SystemExit("Refusing to create the first admin: set ADMIN_PASSWORD in .env to at least 12 characters (not the default).")
    init_db()
    with Session(engine) as session:
        existing = session.exec(select(AdminUser)).first()
        if existing:
            print(f"Admin user already exists ({existing.email}) — skipping.")
            return
        admin = AdminUser(email=settings.admin_email, password_hash=hash_password(settings.admin_password))
        session.add(admin)
        session.commit()
        print(f"Created admin user: {settings.admin_email}")
        print("Log in with the ADMIN_EMAIL / ADMIN_PASSWORD you set in your .env, then change the password.")


if __name__ == "__main__":
    run()
