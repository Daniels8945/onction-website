"""Resets a dashboard admin's password (or creates the admin if missing).

Usage — prompts for the new password without echoing it:
    python -m app.reset_admin admin@onctionenergy.com

On the VPS:
    docker compose exec backend python -m app.reset_admin admin@onctionenergy.com

Run without an email to list the admin accounts that exist.
"""
import getpass
import sys

from sqlmodel import Session, select

from .database import engine, init_db
from .models_admin import AdminUser
from .security import hash_password


def main() -> int:
    init_db()
    with Session(engine) as session:
        admins = session.exec(select(AdminUser)).all()
        if len(sys.argv) < 2:
            print("Admin accounts:" if admins else "No admin accounts yet.")
            for a in admins:
                print(f"  {a.email}  ({a.role})")
            return 0
        email = sys.argv[1].strip().lower()
        pw = getpass.getpass("New password (min 8 chars): ")
        if len(pw) < 8 or pw != getpass.getpass("Repeat new password: "):
            print("Passwords must match and be at least 8 characters — nothing changed.")
            return 1
        admin = next((a for a in admins if a.email.lower() == email), None)
        if admin is None:
            admin = AdminUser(email=email, password_hash=hash_password(pw))
            print(f"Created admin {email}.")
        else:
            admin.password_hash = hash_password(pw)
            print(f"Password reset for {email}.")
        session.add(admin)
        session.commit()
    return 0


if __name__ == "__main__":
    sys.exit(main())
