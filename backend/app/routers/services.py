from datetime import datetime
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models_admin import AdminUser
from ..models_services import Service, ServiceCreate, ServiceRead, ServiceUpdate
from ..models_vendors import Vendor
from ..security import get_current_identity, require_role

router = APIRouter(prefix="/api/vendor-platform/services", tags=["vendor-platform"])


@router.get("", response_model=list[ServiceRead])
def list_services(
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    kind, _obj = identity
    query = select(Service)
    if kind == "vendor":
        query = query.where(Service.active == True)  # noqa: E712 — SQLAlchemy needs `== True`, not `is True`
    return session.exec(query.order_by(Service.name)).all()


@router.post("", response_model=ServiceRead, status_code=201)
def create_service(
    payload: ServiceCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    service = Service(**payload.model_dump())
    session.add(service)
    session.commit()
    session.refresh(service)
    return service


@router.put("/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    service = session.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    service.updated_at = datetime.utcnow()
    session.add(service)
    session.commit()
    session.refresh(service)
    return service


@router.delete("/{service_id}", status_code=204)
def delete_service(
    service_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    service = session.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    session.delete(service)
    session.commit()
