import os
import sys
import tempfile
from pathlib import Path

# A throwaway SQLite database for the whole test run, set before the app (and its
# module-level engine/settings) is imported.
_tmp = tempfile.mkdtemp(prefix="onction-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp) / 'test.db'}"
os.environ.setdefault("JWT_SECRET", "test-secret-" + "x" * 40)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.database import engine
from app.main import app
from app.models_admin import AdminUser
from app.security import hash_password


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture
def admin_token(client):
    """Create a dashboard user with the given role and return a bearer token."""
    counter = {"n": 0}

    def make(role: str) -> str:
        counter["n"] += 1
        email = f"{role.lower().replace(' ', '')}{counter['n']}-{os.urandom(3).hex()}@example.com"
        with Session(engine) as s:
            s.add(AdminUser(email=email, password_hash=hash_password("password123"), role=role))
            s.commit()
        r = client.post("/api/auth/login", json={"email": email, "password": "password123"})
        assert r.status_code == 200, r.text
        return r.json()["access_token"]

    return make
