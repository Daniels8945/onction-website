"""Regression tests for the critical findings in AUDIT.md (C1–C3)."""
import os
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlmodel import Session, select

from app.config import Settings
from app.database import engine
from app.models_vendors import Vendor

PG = "postgresql+psycopg://onction:x@db:5432/onction"
DEV_JWT_SECRET = "dev-only-insecure-secret-change-me"  # the shipped default
BACKEND = Path(__file__).resolve().parents[1]


# ── C1: the backend never signs tokens with an empty / weak secret ─────────
def test_empty_jwt_secret_is_refused():
    with pytest.raises(ValidationError, match="JWT_SECRET is empty"):
        Settings(jwt_secret="", _env_file=None)


@pytest.mark.parametrize("secret", [DEV_JWT_SECRET, "short-secret"])
def test_weak_jwt_secret_is_refused_in_production(secret):
    with pytest.raises(ValidationError, match="at least 32 characters"):
        Settings(database_url=PG, jwt_secret=secret, _env_file=None)


def test_strong_secret_in_production_and_dev_default_locally_are_accepted():
    Settings(database_url=PG, jwt_secret="a" * 64, _env_file=None)
    Settings(database_url="sqlite:///./x.db", jwt_secret=DEV_JWT_SECRET, _env_file=None)


@pytest.mark.parametrize("password", ["change-me-immediately", "short"])
def test_seed_refuses_weak_first_admin_password_in_production(password):
    env = {**os.environ, "DATABASE_URL": PG, "JWT_SECRET": "a" * 64, "ADMIN_PASSWORD": password}
    r = subprocess.run([sys.executable, "-m", "app.seed"], cwd=BACKEND, env=env, capture_output=True, text=True)
    assert r.returncode != 0
    assert "Refusing to create the first admin" in r.stderr


# ── C2: a vendor code is never enough on its own ───────────────────────────
def _register(client, **extra):
    body = {"company_name": f"Co {os.urandom(3).hex()}", "email": "v@example.com", **extra}
    return client.post("/api/vendor-platform/auth/register", json=body)


def test_registration_requires_a_password(client):
    assert _register(client).status_code == 422
    assert _register(client, password="short").status_code == 422


def test_login_requires_the_password(client):
    code = _register(client, password="vendorpass1").json()["vendor_code"]
    login = lambda **b: client.post("/api/vendor-platform/auth/login", json={"vendor_code": code, **b})
    assert login().status_code == 422
    assert login(password="").status_code == 422
    assert login(password="wrong-password").status_code == 401
    r = login(password="vendorpass1")
    assert r.status_code == 200 and r.json()["access_token"]


def test_vendor_without_a_password_cannot_sign_in(client):
    code = _register(client, password="vendorpass1").json()["vendor_code"]
    with Session(engine) as s:  # e.g. an admin-created or legacy account
        v = s.exec(select(Vendor).where(Vendor.vendor_code == code)).one()
        v.password_hash = None
        s.add(v)
        s.commit()
    r = client.post("/api/vendor-platform/auth/login", json={"vendor_code": code, "password": "anything"})
    assert r.status_code == 401
    assert "Forgot password" in r.json()["detail"]


def test_status_is_not_revealed_without_the_password(client):
    code = _register(client, password="vendorpass1").json()["vendor_code"]
    with Session(engine) as s:
        v = s.exec(select(Vendor).where(Vendor.vendor_code == code)).one()
        v.status, v.rejection_reason = "Rejected", "Internal reason"
        s.add(v)
        s.commit()
    wrong = client.post("/api/vendor-platform/auth/login", json={"vendor_code": code, "password": "wrong-password"})
    assert wrong.status_code == 401 and "Internal reason" not in wrong.text
    right = client.post("/api/vendor-platform/auth/login", json={"vendor_code": code, "password": "vendorpass1"})
    assert right.status_code == 403


# ── C3: only Super Admins manage the team ──────────────────────────────────
def _new_user(role="Admin"):
    return {"email": f"new-{os.urandom(3).hex()}@example.com", "password": "password123", "role": role}


@pytest.mark.parametrize("role", ["Viewer", "Admin"])
def test_non_super_admins_cannot_create_or_deactivate_users(client, admin_token, role):
    auth = {"Authorization": f"Bearer {admin_token(role)}"}
    assert client.post("/api/admin/users", headers=auth, json=_new_user("Super Admin")).status_code == 403
    assert client.delete("/api/admin/users/1", headers=auth).status_code == 403


def test_super_admin_can_create_users_with_valid_roles_only(client, admin_token):
    auth = {"Authorization": f"Bearer {admin_token('Super Admin')}"}
    r = client.post("/api/admin/users", headers=auth, json=_new_user("Viewer"))
    assert r.status_code == 201 and r.json()["role"] == "Viewer"
    assert client.post("/api/admin/users", headers=auth, json=_new_user("Owner")).status_code == 422


def test_every_role_can_still_list_the_team(client, admin_token):
    for role in ["Viewer", "Admin", "Super Admin"]:
        r = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token(role)}"})
        assert r.status_code == 200
