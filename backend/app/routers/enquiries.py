import html

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlmodel import Session, select

from ..analytics_utils import get_session_attribution
from ..config import get_settings
from ..database import get_session
from ..email import button, render_shell, try_send_email
from ..models import Enquiry, EnquiryCreate, EnquiryRead
from ..models_admin import AdminUser
from ..security import get_current_admin

router = APIRouter(prefix="/api/enquiries", tags=["enquiries"])
settings = get_settings()


@router.post("", response_model=EnquiryRead, status_code=201)
def create_enquiry(payload: EnquiryCreate, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """Public — this is the website's contact form submitting."""
    data = payload.model_dump(exclude={"session_id"})
    enquiry = Enquiry(**data, **get_session_attribution(session, payload.session_id))
    session.add(enquiry)
    session.commit()
    session.refresh(enquiry)

    e = lambda v: html.escape(v or "")
    rows = "".join(
        f'<tr><td style="padding:6px 12px 6px 0;color:#5B6B80;white-space:nowrap;vertical-align:top;">{k}</td><td style="padding:6px 0;">{v}</td></tr>'
        for k, v in [
            ("Name", e(enquiry.full_name)),
            ("Email", f'<a href="mailto:{e(enquiry.email)}" style="color:#0FB5A6;">{e(enquiry.email)}</a>'),
            ("Phone", e(enquiry.phone)),
            ("Company", e(enquiry.company) or "—"),
            ("Country", e(enquiry.country) or "—"),
        ]
    )
    message_html = e(enquiry.message).replace("\n", "<br>")
    site = settings.public_site_url.rstrip("/")

    # 1. Alert to the team — Reply-To is the visitor, so answering is one click.
    background_tasks.add_task(
        try_send_email,
        settings.resolved_alert_email,
        f"New enquiry: {enquiry.full_name}" + (f" ({enquiry.company})" if enquiry.company else ""),
        render_shell(
            f'<h1 style="margin:0 0 16px;font-size:20px;">New website enquiry</h1>'
            f'<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">{rows}</table>'
            f'<p style="margin:20px 0 6px;color:#5B6B80;font-size:13px;">Message</p>'
            f'<div style="padding:14px 16px;background:#f4f7f9;border-left:3px solid #13C2B6;">{message_html}</div>'
            + button("Open in the dashboard", f"{site}/admin/enquiries")
            + '<p style="font-size:13px;color:#5B6B80;">Reply to this email to answer the visitor directly.</p>',
            preheader=f"{enquiry.full_name}: {(enquiry.message or '')[:90]}",
        ),
        None,
        enquiry.email,
    )

    # 2. Confirmation to the visitor.
    first = e((enquiry.full_name or "").split(" ")[0]) or "there"
    background_tasks.add_task(
        try_send_email,
        enquiry.email,
        "We've received your enquiry — Onction Energy",
        render_shell(
            f'<h1 style="margin:0 0 16px;font-size:20px;">Thanks, {first} — we\'ve got your message</h1>'
            "<p>Your enquiry has reached our trading desk. A member of the team will get back to you shortly.</p>"
            f'<p style="margin:20px 0 6px;color:#5B6B80;font-size:13px;">What you sent us</p>'
            f'<div style="padding:14px 16px;background:#f4f7f9;border-left:3px solid #13C2B6;">{message_html}</div>'
            "<p>If it's urgent, call the desk on <strong>+234 708 058 2578</strong>.</p>"
            + button("Explore our solutions", f"{site}/solutions"),
            preheader="Your enquiry has reached the Onction trading desk.",
        ),
        None,
        settings.resolved_alert_email,
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
