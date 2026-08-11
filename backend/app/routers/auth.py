from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models_admin import AdminLogin, AdminRead, TokenResponse, AdminUser
from ..security import create_access_token, get_current_admin, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: AdminLogin, session: Session = Depends(get_session)):
    admin = session.exec(select(AdminUser).where(AdminUser.email == payload.email)).first()
    if admin is None or not admin.is_active or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    token = create_access_token(subject=admin.email)
    return TokenResponse(
        access_token=token,
        admin=AdminRead(id=admin.id, email=admin.email, full_name=admin.full_name, is_active=admin.is_active),
    )


@router.get("/me", response_model=AdminRead)
def me(current: AdminUser = Depends(get_current_admin)):
    return AdminRead(id=current.id, email=current.email, full_name=current.full_name, is_active=current.is_active)
