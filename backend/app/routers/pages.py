from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models_admin import AdminUser
from ..models_content import (
    Block,
    BlockWrite,
    Page,
    PageCreate,
    PageListItem,
    PageRead,
    PageUpdate,
)
from ..security import get_current_admin

router = APIRouter(prefix="/api/pages", tags=["pages"])


@router.get("/public/{slug}", response_model=PageRead)
def get_public_page(slug: str, session: Session = Depends(get_session)):
    """Used by the public site to render a page built in the dashboard.
    Only ever returns published pages — drafts stay invisible."""
    page = session.exec(select(Page).where(Page.slug == slug, Page.status == "published")).first()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


@router.get("", response_model=list[PageListItem])
def list_pages(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    """Dashboard-only — all pages regardless of status."""
    return session.exec(select(Page).order_by(Page.updated_at.desc())).all()


@router.get("/{page_id}", response_model=PageRead)
def get_page(
    page_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    page = session.get(Page, page_id)
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


@router.post("", response_model=PageRead, status_code=201)
def create_page(
    payload: PageCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    existing = session.exec(select(Page).where(Page.slug == payload.slug)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A page with this slug already exists")
    page = Page(**payload.model_dump())
    session.add(page)
    session.commit()
    session.refresh(page)
    return page


@router.put("/{page_id}", response_model=PageRead)
def update_page(
    page_id: int,
    payload: PageUpdate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    page = session.get(Page, page_id)
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    updates = payload.model_dump(exclude_unset=True)
    if "slug" in updates and updates["slug"] != page.slug:
        clash = session.exec(select(Page).where(Page.slug == updates["slug"])).first()
        if clash:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A page with this slug already exists")
    for field, value in updates.items():
        setattr(page, field, value)
    page.updated_at = datetime.utcnow()
    session.add(page)
    session.commit()
    session.refresh(page)
    return page


@router.put("/{page_id}/blocks", response_model=PageRead)
def replace_blocks(
    page_id: int,
    blocks: list[BlockWrite],
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    """Saves the full ordered block list in one shot — this is what the
    page builder calls on every save, since reordering/adding/removing
    blocks is far simpler as a full replace than diffing on the client."""
    page = session.get(Page, page_id)
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    # Clear (not manually session.delete()) so the relationship's own
    # delete-orphan cascade removes the old rows — deleting them directly
    # while they're still in page.blocks's collection conflicts with that
    # cascade and raises "Instance has been deleted" on the next flush.
    page.blocks.clear()
    session.flush()

    for item in blocks:
        session.add(Block(page_id=page_id, type=item.type, position=item.position, data=item.data))

    page.updated_at = datetime.utcnow()
    session.commit()
    session.refresh(page)
    return page


@router.delete("/{page_id}", status_code=204)
def delete_page(
    page_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    page = session.get(Page, page_id)
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    session.delete(page)
    session.commit()
