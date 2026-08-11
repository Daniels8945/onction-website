from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import Session, select

from ..config import get_settings
from ..database import engine, get_session
from ..email import render_shell, try_send_email
from ..models_admin import AdminUser
from ..models_newsletter import Campaign, CampaignCreate, CampaignRead, Subscriber, SubscribeRequest, SubscriberRead
from ..security import get_current_admin

router = APIRouter(prefix="/api/newsletter", tags=["newsletter"])
settings = get_settings()


@router.post("/subscribe", response_model=SubscriberRead, status_code=201)
def subscribe(payload: SubscribeRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(Subscriber).where(Subscriber.email == payload.email)).first()
    if existing:
        if existing.status != "subscribed":
            existing.status = "subscribed"
            session.add(existing)
            session.commit()
            session.refresh(existing)
        return existing
    sub = Subscriber(email=payload.email, name=payload.name)
    session.add(sub)
    session.commit()
    session.refresh(sub)
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


@router.get("/subscribers", response_model=list[SubscriberRead])
def list_subscribers(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    return session.exec(select(Subscriber).order_by(Subscriber.created_at.desc())).all()


@router.get("/campaigns", response_model=list[CampaignRead])
def list_campaigns(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    return session.exec(select(Campaign).order_by(Campaign.created_at.desc())).all()


@router.post("/campaigns", response_model=CampaignRead, status_code=201)
def create_campaign(
    payload: CampaignCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    campaign = Campaign(**payload.model_dump())
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign


@router.put("/campaigns/{campaign_id}", response_model=CampaignRead)
def update_campaign(
    campaign_id: int,
    payload: CampaignCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    campaign = session.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.status == "sent":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A sent campaign can't be edited")
    campaign.subject = payload.subject
    campaign.body = payload.body
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign


@router.delete("/campaigns/{campaign_id}", status_code=204)
def delete_campaign(
    campaign_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    campaign = session.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    session.delete(campaign)
    session.commit()


def _send_campaign(campaign_id: int) -> None:
    """Runs as a background task: loops every active subscriber and sends
    the campaign one at a time over SMTP. Synchronous smtplib in a loop is
    fine at the subscriber counts a site like this sees — if that ever
    changes, swap the provider (SES/SendGrid) rather than this loop, since
    the SMTP interface stays the same either way."""
    with Session(engine) as session:
        campaign = session.get(Campaign, campaign_id)
        if campaign is None or campaign.status == "sent":
            return
        subscribers = session.exec(select(Subscriber).where(Subscriber.status == "subscribed")).all()

        sent, failed = 0, 0
        body_html = "".join(f"<p>{line}</p>" for line in campaign.body.split("\n") if line.strip())
        for sub in subscribers:
            unsubscribe_url = f"{settings.public_site_url}/unsubscribe?token={sub.unsubscribe_token}"
            html = render_shell(f"<h1 style='font-size:20px;'>{campaign.subject}</h1>{body_html}", unsubscribe_url)
            ok = try_send_email(sub.email, campaign.subject, html)
            sent += 1 if ok else 0
            failed += 0 if ok else 1

        campaign.status = "sent"
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
    current: AdminUser = Depends(get_current_admin),
):
    campaign = session.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.status == "sent":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This campaign was already sent")
    if not settings.smtp_host:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SMTP isn't configured yet (set SMTP_HOST etc.)")

    background_tasks.add_task(_send_campaign, campaign_id)
    return campaign
