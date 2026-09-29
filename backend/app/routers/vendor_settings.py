from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..database import get_session
from ..models_admin import AdminUser
from ..models_vendor_settings import VendorPlatformSettingsRead, VendorPlatformSettingsUpdate
from ..security import require_role
from ..vendor_platform_utils import get_platform_settings

router = APIRouter(prefix="/api/vendor-platform/settings", tags=["vendor-platform"])


@router.get("", response_model=VendorPlatformSettingsRead)
def get_settings_route(session: Session = Depends(get_session)):
    """Public — the vendor portal needs currency/support email before login."""
    return get_platform_settings(session)


@router.put("", response_model=VendorPlatformSettingsRead)
def update_settings_route(
    payload: VendorPlatformSettingsUpdate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    settings_row = get_platform_settings(session)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings_row, field, value)
    session.add(settings_row)
    session.commit()
    session.refresh(settings_row)
    return settings_row
