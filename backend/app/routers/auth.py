import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import Session, select

from ..config import get_settings
from ..database import get_session
from ..email import render_shell, try_send_email
from ..models_admin import AdminForgotPassword, AdminLogin, AdminRead, AdminResetPassword, TokenResponse, AdminUser
from ..security import create_access_token, get_current_admin, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()
RESET_TOKEN_TTL = timedelta(hours=1)


@router.post("/login", response_model=TokenResponse)
def login(payload: AdminLogin, session: Session = Depends(get_session)):
    admin = session.exec(select(AdminUser).where(AdminUser.email == payload.email)).first()
    if admin is None or not admin.is_active or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    token = create_access_token(subject=admin.email)
    return TokenResponse(
        access_token=token,
        admin=AdminRead(
            id=admin.id, email=admin.email, full_name=admin.full_name, is_active=admin.is_active, role=admin.role
        ),
    )


@router.get("/me", response_model=AdminRead)
def me(current: AdminUser = Depends(get_current_admin)):
    return AdminRead(
        id=current.id, email=current.email, full_name=current.full_name, is_active=current.is_active, role=current.role
    )


@router.post("/forgot-password", status_code=202)
def forgot_password(
    payload: AdminForgotPassword,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Always responds 202 regardless of whether the email matched an account,
    so this endpoint can't be used to enumerate admin email addresses."""
    admin = session.exec(select(AdminUser).where(AdminUser.email == payload.email)).first()
    if admin and admin.is_active:
        admin.reset_token = secrets.token_urlsafe(32)
        admin.reset_expires = datetime.utcnow() + RESET_TOKEN_TTL
        session.add(admin)
        session.commit()
        reset_url = f"{settings.public_site_url}/admin/reset-password?token={admin.reset_token}"
        background_tasks.add_task(
            try_send_email,
            admin.email,
            "Reset your dashboard password",
            render_shell(
                f'<p>Click the link below to set a new password. It expires in 1 hour.</p>'
                f'<p><a href="{reset_url}">{reset_url}</a></p>'
                f"<p>If you didn't request this, you can ignore this email.</p>"
            ),
        )
    return {"detail": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password", status_code=204)
def reset_password(payload: AdminResetPassword, session: Session = Depends(get_session)):
    admin = session.exec(select(AdminUser).where(AdminUser.reset_token == payload.token)).first()
    if admin is None or admin.reset_expires is None or admin.reset_expires < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")
    admin.password_hash = hash_password(payload.new_password)
    admin.reset_token = None
    admin.reset_expires = None
    session.add(admin)
    session.commit()
