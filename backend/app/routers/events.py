import csv
import io
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlmodel import Session, delete, func, select

from ..analytics_utils import get_session_attribution
from ..config import get_settings
from ..database import get_session
from ..email import render_shell, try_send_email
from ..models_admin import AdminUser
from ..models_events import (
    Event,
    EventCreate,
    EventRead,
    EventUpdate,
    Registration,
    RegistrationCreate,
    RegistrationRead,
)
from ..security import get_current_admin

router = APIRouter(prefix="/api/events", tags=["events"])
settings = get_settings()


def _counts(session: Session, event_id: int) -> tuple[int, int]:
    registered = session.exec(
        select(func.count()).select_from(Registration).where(Registration.event_id == event_id, Registration.status == "registered")
    ).one()
    waitlisted = session.exec(
        select(func.count()).select_from(Registration).where(Registration.event_id == event_id, Registration.status == "waitlisted")
    ).one()
    return registered, waitlisted


def _to_read(session: Session, event: Event) -> EventRead:
    registered, waitlisted = _counts(session, event.id)
    return EventRead(**event.model_dump(), registered_count=registered, waitlisted_count=waitlisted)


@router.get("/public", response_model=list[EventRead])
def list_public_events(session: Session = Depends(get_session)):
    events = session.exec(
        select(Event).where(Event.status == "published").order_by(Event.starts_at)
    ).all()
    return [_to_read(session, e) for e in events]


@router.get("/public/{slug}", response_model=EventRead)
def get_public_event(slug: str, session: Session = Depends(get_session)):
    event = session.exec(select(Event).where(Event.slug == slug, Event.status == "published")).first()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _to_read(session, event)


@router.post("/public/{slug}/register", response_model=RegistrationRead, status_code=201)
def register_for_event(
    slug: str,
    payload: RegistrationCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    event = session.exec(select(Event).where(Event.slug == slug, Event.status == "published")).first()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    registered_count, _ = _counts(session, event.id)
    is_full = event.capacity is not None and registered_count >= event.capacity
    reg_status = "waitlisted" if is_full else "registered"

    data = payload.model_dump(exclude={"session_id"})
    registration = Registration(
        event_id=event.id,
        status=reg_status,
        **data,
        **get_session_attribution(session, payload.session_id),
    )
    session.add(registration)
    session.commit()
    session.refresh(registration)

    background_tasks.add_task(_send_registration_email, payload.email, payload.full_name, event.title, reg_status)
    background_tasks.add_task(
        try_send_email,
        settings.resolved_alert_email,
        f"New {'waitlist signup' if is_full else 'registration'}: {event.title}",
        render_shell(f"<p>{payload.full_name} ({payload.email}) just {'joined the waitlist for' if is_full else 'registered for'} <strong>{event.title}</strong>.</p>"),
    )
    return registration


def _send_registration_email(to_email: str, name: str, event_title: str, reg_status: str) -> None:
    if reg_status == "waitlisted":
        body = f"<p>Hi {name},</p><p>Thanks for your interest in <strong>{event_title}</strong> — it's currently full, so you've been added to the waitlist. We'll email you if a spot opens up.</p>"
        subject = f"You're on the waitlist: {event_title}"
    else:
        body = f"<p>Hi {name},</p><p>You're registered for <strong>{event_title}</strong>. We'll be in touch with details closer to the date.</p>"
        subject = f"You're registered: {event_title}"
    try_send_email(to_email, subject, render_shell(body))


@router.get("", response_model=list[EventRead])
def list_events(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    events = session.exec(select(Event).order_by(Event.starts_at.desc())).all()
    return [_to_read(session, e) for e in events]


@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    event = session.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _to_read(session, event)


@router.post("", response_model=EventRead, status_code=201)
def create_event(
    payload: EventCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    existing = session.exec(select(Event).where(Event.slug == payload.slug)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An event with this slug already exists")
    event = Event(**payload.model_dump())
    session.add(event)
    session.commit()
    session.refresh(event)
    return _to_read(session, event)


@router.put("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    payload: EventUpdate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    event = session.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    updates = payload.model_dump(exclude_unset=True)
    if "slug" in updates and updates["slug"] != event.slug:
        clash = session.exec(select(Event).where(Event.slug == updates["slug"])).first()
        if clash:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An event with this slug already exists")
    for field, value in updates.items():
        setattr(event, field, value)
    event.updated_at = datetime.utcnow()
    session.add(event)
    session.commit()
    session.refresh(event)
    return _to_read(session, event)


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    event = session.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    # Registration has no cascade relationship back to Event, so its rows
    # need clearing first or the delete below violates the FK constraint.
    session.exec(delete(Registration).where(Registration.event_id == event_id))
    session.delete(event)
    session.commit()


@router.get("/{event_id}/registrations", response_model=list[RegistrationRead])
def list_registrations(
    event_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    return session.exec(
        select(Registration).where(Registration.event_id == event_id).order_by(Registration.created_at)
    ).all()


@router.get("/{event_id}/registrations/export")
def export_registrations(
    event_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    rows = session.exec(
        select(Registration).where(Registration.event_id == event_id).order_by(Registration.created_at)
    ).all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Name", "Email", "Company", "Status", "Registered at"])
    for r in rows:
        writer.writerow([r.full_name, r.email, r.company or "", r.status, r.created_at.isoformat()])
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=event-{event_id}-registrations.csv"},
    )


@router.delete("/{event_id}/registrations/{registration_id}", status_code=204)
def cancel_registration(
    event_id: int,
    registration_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    """Cancels a registration and, if it freed up a confirmed spot, promotes
    the longest-waiting person on the waitlist into it."""
    reg = session.get(Registration, registration_id)
    if reg is None or reg.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")
    was_registered = reg.status == "registered"
    reg.status = "cancelled"
    session.add(reg)
    session.commit()

    if was_registered:
        next_waitlisted = session.exec(
            select(Registration)
            .where(Registration.event_id == event_id, Registration.status == "waitlisted")
            .order_by(Registration.created_at)
        ).first()
        if next_waitlisted:
            next_waitlisted.status = "registered"
            session.add(next_waitlisted)
            session.commit()
            event = session.get(Event, event_id)
            try_send_email(
                next_waitlisted.email,
                f"A spot opened up: {event.title}",
                render_shell(f"<p>Hi {next_waitlisted.full_name},</p><p>Good news — a spot opened up for <strong>{event.title}</strong> and you're now registered.</p>"),
            )
