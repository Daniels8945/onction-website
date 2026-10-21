import csv
import io
import re
from datetime import datetime
from html import escape

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy import update
from sqlmodel import Session, func, select

from ..config import get_settings
from ..content_rules import check_image_url
from ..database import engine, get_session
from ..email import button, render_shell, send_email, try_send_email
from ..models_admin import AdminUser
from ..models_newsletter import (
    Campaign,
    CampaignCreate,
    CampaignPreview,
    CampaignRead,
    Subscriber,
    SubscribeRequest,
    SubscriberRead,
)
from ..security import get_current_admin, require_editor

router = APIRouter(prefix="/api/newsletter", tags=["newsletter"])
settings = get_settings()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$", re.IGNORECASE)


def _unsubscribe_url(sub: Subscriber) -> str:
    return f"{settings.public_site_url.rstrip('/')}/unsubscribe?token={sub.unsubscribe_token}"


def _send_welcome(background_tasks: BackgroundTasks, sub: Subscriber) -> None:
    site = settings.public_site_url.rstrip("/")
    background_tasks.add_task(
        try_send_email,
        sub.email,
        "Welcome to Onction Energy market news",
        render_shell(
            '<h1 style="margin:0 0 16px;font-size:20px;">You\'re subscribed</h1>'
            "<p>Thanks for signing up. You'll receive trading updates, market news and invitations to Onction events — "
            "no spam, and you can unsubscribe at any time.</p>"
            + button("Read the latest news", f"{site}/news"),
            unsubscribe_url=_unsubscribe_url(sub),
            preheader="You're on the list for Onction Energy market news.",
        ),
    )
    background_tasks.add_task(
        try_send_email,
        settings.resolved_alert_email,
        f"New newsletter subscriber: {sub.email}",
        render_shell(f"<p><strong>{sub.email}</strong> just subscribed to the newsletter.</p>" + button("View subscribers", f"{site}/admin/newsletter")),
    )


@router.post("/subscribe", response_model=SubscriberRead, status_code=201)
def subscribe(payload: SubscribeRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """Public. Idempotent: an existing subscriber isn't emailed again, but a
    previously unsubscribed address that signs up again is re-activated and
    welcomed back. Addresses are compared case-insensitively."""
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid email address")
    existing = session.exec(select(Subscriber).where(func.lower(Subscriber.email) == email)).first()
    if existing:
        if existing.status != "subscribed":
            existing.status = "subscribed"
            session.add(existing)
            session.commit()
            session.refresh(existing)
            _send_welcome(background_tasks, existing)
        return existing
    sub = Subscriber(email=email, name=(payload.name or "").strip() or None)
    session.add(sub)
    session.commit()
    session.refresh(sub)
    _send_welcome(background_tasks, sub)
    return sub


@router.get("/unsubscribe")
def unsubscribe(token: str, session: Session = Depends(get_session)):
    sub = session.exec(select(Subscriber).where(Subscriber.unsubscribe_token == token)).first()
    if sub is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid unsubscribe link")
    sub.status = "unsubscribed"
    session.add(sub)
    session.commit()
    return {"status": "unsubscribed"}


@router.get("/overview")
def overview(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    """What the Newsletter screen needs up front: can email actually be sent
    from this server, and how many people would a send reach."""
    return {"email_configured": bool(settings.smtp_host), "active_subscribers": _active_count(session)}


@router.get("/subscribers", response_model=list[SubscriberRead])
def list_subscribers(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    return session.exec(select(Subscriber).order_by(Subscriber.created_at.desc())).all()


@router.get("/subscribers/export")
def export_subscribers(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    """CSV of every subscriber (with status, so unsubscribed addresses are kept
    as a suppression list). Editors only — it's personal data."""
    rows = session.exec(select(Subscriber).order_by(Subscriber.created_at)).all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Email", "Name", "Status", "Subscribed at"])
    for r in rows:
        writer.writerow([r.email, r.name or "", r.status, r.created_at.isoformat()])
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=newsletter-subscribers.csv", "Cache-Control": "no-store"},
    )


def _get_subscriber(session: Session, subscriber_id: int) -> Subscriber:
    sub = session.get(Subscriber, subscriber_id)
    if sub is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscriber not found")
    return sub


@router.post("/subscribers/{subscriber_id}/unsubscribe", response_model=SubscriberRead)
def admin_unsubscribe(
    subscriber_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    """For someone who asked by email or phone. Their address stays on file as
    unsubscribed, so campaigns skip it. There's deliberately no way to
    re-subscribe someone from the dashboard — only they can, by signing up again."""
    sub = _get_subscriber(session, subscriber_id)
    sub.status = "unsubscribed"
    session.add(sub)
    session.commit()
    session.refresh(sub)
    return sub


@router.delete("/subscribers/{subscriber_id}", status_code=204)
def delete_subscriber(
    subscriber_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    """Erases the record entirely (a data-deletion request)."""
    session.delete(_get_subscriber(session, subscriber_id))
    session.commit()


# --- Campaigns ---------------------------------------------------------------

def _absolute(url: str) -> str:
    # Email clients need a full address; uploaded files are stored as /api/files/….
    return f"{settings.public_site_url.rstrip('/')}{url}" if url.startswith("/") else url


def campaign_html(campaign: Campaign, unsubscribe_url: str) -> str:
    """The exact email a subscriber receives. Subject and body are escaped:
    the editor takes plain text, one paragraph per line."""
    image = (
        f'<img src="{escape(_absolute(campaign.image_url), quote=True)}" alt="" width="100%" '
        f'style="display:block;width:100%;max-width:100%;height:auto;margin:0 0 20px;border:0;">'
        if campaign.image_url
        else ""
    )
    body_html = "".join(
        f'<p style="margin:0 0 14px;line-height:1.6;">{escape(line)}</p>' for line in campaign.body.split("\n") if line.strip()
    )
    return render_shell(
        f"{image}<h1 style='margin:0 0 16px;font-size:20px;'>{escape(campaign.subject)}</h1>{body_html}",
        unsubscribe_url,
    )


def _active_count(session: Session) -> int:
    return session.exec(select(func.count()).select_from(Subscriber).where(Subscriber.status == "subscribed")).one()


def _get_campaign(session: Session, campaign_id: int) -> Campaign:
    campaign = session.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


def _clean_campaign(payload: CampaignCreate) -> dict:
    subject = payload.subject.strip()
    if not subject:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A subject line is required")
    return {"subject": subject, "body": payload.body, "image_url": check_image_url(payload.image_url)}


@router.get("/campaigns", response_model=list[CampaignRead])
def list_campaigns(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    return session.exec(select(Campaign).order_by(Campaign.created_at.desc())).all()


@router.get("/campaigns/{campaign_id}", response_model=CampaignRead)
def get_campaign(
    campaign_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    return _get_campaign(session, campaign_id)


@router.get("/campaigns/{campaign_id}/preview", response_model=CampaignPreview)
def preview_campaign(
    campaign_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    """Renders the email exactly as it would be sent. Sends nothing."""
    campaign = _get_campaign(session, campaign_id)
    sample_unsubscribe = f"{settings.public_site_url.rstrip('/')}/unsubscribe?token=preview"
    return CampaignPreview(
        subject=campaign.subject,
        html=campaign_html(campaign, sample_unsubscribe),
        recipients=_active_count(session),
        email_configured=bool(settings.smtp_host),
    )


@router.post("/campaigns", response_model=CampaignRead, status_code=201)
def create_campaign(
    payload: CampaignCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    campaign = Campaign(**_clean_campaign(payload))
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign


@router.put("/campaigns/{campaign_id}", response_model=CampaignRead)
def update_campaign(
    campaign_id: int,
    payload: CampaignCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    campaign = _get_campaign(session, campaign_id)
    if campaign.status not in ("draft", "failed"):  # "failed" reached nobody, so it's still editable
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only a draft can be edited — this campaign has already been sent")
    for field, value in _clean_campaign(payload).items():
        setattr(campaign, field, value)
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign


@router.delete("/campaigns/{campaign_id}", status_code=204)
def delete_campaign(
    campaign_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    campaign = _get_campaign(session, campaign_id)
    if campaign.status == "sending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This campaign is being sent right now — wait for it to finish")
    session.delete(campaign)
    session.commit()


@router.post("/campaigns/{campaign_id}/test", status_code=200)
def send_test(
    campaign_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    """Sends one copy to the signed-in admin only. Doesn't change the campaign."""
    campaign = _get_campaign(session, campaign_id)
    if not settings.smtp_host:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Email sending isn't set up yet (SMTP_HOST is empty), so no test can be sent")
    sample_unsubscribe = f"{settings.public_site_url.rstrip('/')}/unsubscribe?token=preview"
    try:
        send_email(current.email, f"[Test] {campaign.subject}", campaign_html(campaign, sample_unsubscribe))
    except Exception as exc:  # noqa: BLE001 — report the mail server's answer to the admin
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"The mail server refused the test email: {exc}") from exc
    return {"sent_to": current.email}


def _send_campaign(campaign_id: int) -> None:
    """Runs as a background task: loops every active subscriber and sends
    the campaign one at a time over SMTP. Synchronous smtplib in a loop is
    fine at the subscriber counts a site like this sees — if that ever
    changes, swap the provider (SES/SendGrid) rather than this loop, since
    the SMTP interface stays the same either way."""
    with Session(engine) as session:
        campaign = session.get(Campaign, campaign_id)
        if campaign is None or campaign.status != "sending":
            return
        subscribers = session.exec(select(Subscriber).where(Subscriber.status == "subscribed")).all()

        sent, failed = 0, 0
        for sub in subscribers:
            ok = try_send_email(sub.email, campaign.subject, campaign_html(campaign, _unsubscribe_url(sub)))
            sent += 1 if ok else 0
            failed += 0 if ok else 1

        # Only call it sent if the mail server actually accepted something.
        campaign.status = "sent" if sent else "failed"
        campaign.sent_count = sent
        campaign.failed_count = failed
        campaign.sent_at = datetime.utcnow()
        session.add(campaign)
        session.commit()


@router.post("/campaigns/{campaign_id}/send", response_model=CampaignRead)
def send_campaign(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    campaign = _get_campaign(session, campaign_id)
    if campaign.status in ("sent", "sending"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This campaign was already sent")
    if not settings.smtp_host:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SMTP isn't configured yet (set SMTP_HOST etc.)")
    if _active_count(session) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="There are no active subscribers to send to")

    # Claim the campaign atomically (draft or a failed attempt → sending), so a
    # double click or two admins at once can't send it twice.
    claimed = session.execute(
        update(Campaign)
        .where(Campaign.id == campaign_id, Campaign.status.in_(("draft", "failed")))
        .values(status="sending")
    )
    session.commit()
    if claimed.rowcount != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This campaign was already sent")
    session.refresh(campaign)
    background_tasks.add_task(_send_campaign, campaign_id)
    return campaign
