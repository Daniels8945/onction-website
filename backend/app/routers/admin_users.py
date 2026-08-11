from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models_admin import AdminCreate, AdminRead, AdminUser
from ..security import get_current_admin, hash_password

router = APIRouter(prefix="/api/admin/users", tags=["team"])


@router.get("", response_model=list[AdminRead])
def list_admins(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    return session.exec(select(AdminUser).order_by(AdminUser.created_at)).all()


@router.post("", response_model=AdminRead, status_code=201)
def create_admin(
    payload: AdminCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    existing = session.exec(select(AdminUser).where(AdminUser.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    admin = AdminUser(email=payload.email, full_name=payload.full_name, password_hash=hash_password(payload.password))
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


@router.delete("/{admin_id}", status_code=204)
def deactivate_admin(
    admin_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    """Deactivates (doesn't hard-delete, to preserve who-did-what history
    on tasks/pages/etc.) another admin. An admin can't deactivate themself —
    that'd risk locking everyone out if it were also the last active account."""
    if admin_id == current.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't deactivate your own account")
    admin = session.get(AdminUser, admin_id)
    if admin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    admin.is_active = False
    session.add(admin)
    session.commit()
