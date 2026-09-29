from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from .config import get_settings
from .database import get_session
from .models_admin import AdminUser
from .models_vendors import Vendor

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(subject: str, scope: str = "admin") -> str:
    """`scope` tells an admin token from a vendor token apart at decode time — the
    same secret signs both, so without it a vendor token could otherwise pass as an
    admin token (and vice versa) as long as the subject happened to match a row."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": subject, "scope": scope, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> tuple[str, str]:
    """Returns (subject, scope). `scope` defaults to "admin" for tokens issued before
    the scope claim existed, so pre-existing sessions aren't invalidated by this change."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return subject, payload.get("scope", "admin")


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> AdminUser:
    """Dependency that gates dashboard-only endpoints behind a valid JWT."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    email, scope = decode_access_token(credentials.credentials)
    if scope != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not an admin session")
    admin = session.exec(select(AdminUser).where(AdminUser.email == email)).first()
    if admin is None or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin no longer exists")
    return admin


def get_current_vendor(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> Vendor:
    """Dependency that gates vendor-portal endpoints behind a valid vendor JWT."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    vendor_code, scope = decode_access_token(credentials.credentials)
    if scope != "vendor":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not a vendor session")
    vendor = session.exec(select(Vendor).where(Vendor.vendor_code == vendor_code)).first()
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Vendor no longer exists")
    if vendor.status in ("Rejected", "Inactive"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Account is {vendor.status.lower()}")
    return vendor


def get_current_identity(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> tuple[str, AdminUser | Vendor]:
    """Resolves either an admin or a vendor session from the same bearer token, for
    endpoints both sides call (e.g. invoices, documents) — returns ("admin", AdminUser)
    or ("vendor", Vendor) so the caller can scope the request accordingly."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    subject, scope = decode_access_token(credentials.credentials)
    if scope == "admin":
        admin = session.exec(select(AdminUser).where(AdminUser.email == subject)).first()
        if admin is None or not admin.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin no longer exists")
        return "admin", admin
    if scope == "vendor":
        vendor = session.exec(select(Vendor).where(Vendor.vendor_code == subject)).first()
        if vendor is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Vendor no longer exists")
        if vendor.status in ("Rejected", "Inactive"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Account is {vendor.status.lower()}")
        return "vendor", vendor
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")


def require_role(*roles: str):
    """Dependency factory gating vendor-platform write endpoints by AdminUser.role,
    e.g. `Depends(require_role("Super Admin", "Admin"))` to block Viewers."""

    def _check(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
        if admin.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted for your role")
        return admin

    return _check
