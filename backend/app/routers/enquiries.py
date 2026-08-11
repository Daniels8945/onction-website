from fastapi import APIRouter, BackgroundTasks, Depends
from sqlmodel import Session, select

from ..config import get_settings
from ..database import get_session
from ..email import render_shell, try_send_email
from ..models import Enquiry, EnquiryCreate, EnquiryRead
from ..models_admin import AdminUser
from ..security import get_current_admin

router = APIRouter(prefix="/api/enquiries", tags=["enquiries"])
settings = get_settings()


@router.post("", response_model=EnquiryRead, status_code=201)
def create_enquiry(payload: EnquiryCreate, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """Public — this is the website's contact form submitting."""
    enquiry = Enquiry(**payload.model_dump())
    session.add(enquiry)
    session.commit()
    session.refresh(enquiry)

    background_tasks.add_task(
        try_send_email,
        settings.resolved_alert_email,
        f"New enquiry: {enquiry.full_name}",
        render_shell(
            f"<p>New website enquiry from <strong>{enquiry.full_name}</strong> ({enquiry.email}, {enquiry.phone}).</p>"
            f"<p>{enquiry.company or ''} {enquiry.country or ''}</p>"
            f"<p>{enquiry.message}</p>"
        ),
    )
    return enquiry


@router.get("", response_model=list[EnquiryRead])
def list_enquiries(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    """Dashboard-only — newest first. Requires a valid admin JWT."""
    rows = session.exec(select(Enquiry).order_by(Enquiry.created_at.desc())).all()
    return rows
