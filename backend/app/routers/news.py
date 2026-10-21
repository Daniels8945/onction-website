from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..content_rules import check_image_url, check_not_stale, check_slug, check_status, check_text
from ..database import get_session
from ..models_admin import AdminUser
from ..models_news import Post, PostCreate, PostListItem, PostRead, PostUpdate
from ..security import get_current_admin, require_editor

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("/public", response_model=list[PostListItem])
def list_public_posts(category: str | None = Query(default=None), session: Session = Depends(get_session)):
    query = select(Post).where(Post.status == "published").order_by(Post.published_at.desc())
    if category:
        query = query.where(Post.category == category)
    return session.exec(query).all()


@router.get("/public/{slug}", response_model=PostRead)
def get_public_post(slug: str, session: Session = Depends(get_session)):
    post = session.exec(select(Post).where(Post.slug == slug, Post.status == "published")).first()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


@router.get("/preview/{slug}", response_model=PostRead)
def preview_post(
    slug: str,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    """Staff only: the article as the public page would show it, drafts
    included. The public endpoints above never return a draft."""
    post = session.exec(select(Post).where(Post.slug == slug)).first()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


def _clean(values: dict) -> dict:
    if "slug" in values:
        values["slug"] = check_slug(values["slug"])
    if "title" in values:
        values["title"] = check_text(values["title"], "Title")
    if "category" in values:
        values["category"] = check_text(values["category"], "Category")[:80]
    if "summary" in values and values["summary"] is not None and len(values["summary"]) > 400:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The summary can be at most 400 characters")
    if "status" in values:
        values["status"] = check_status(values["status"])
    if "cover_image_url" in values:
        values["cover_image_url"] = check_image_url(values["cover_image_url"])
    for nullable_text in ("summary", "body"):
        if nullable_text in values and values[nullable_text] is None:
            values[nullable_text] = ""
    return values


@router.get("", response_model=list[PostListItem])
def list_posts(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    return session.exec(select(Post).order_by(Post.updated_at.desc())).all()


@router.get("/{post_id}", response_model=PostRead)
def get_post(
    post_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    post = session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


@router.post("", response_model=PostRead, status_code=201)
def create_post(
    payload: PostCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    values = _clean(payload.model_dump())
    existing = session.exec(select(Post).where(Post.slug == values["slug"])).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A post with this slug already exists")
    post = Post(**values)
    if post.status == "published":
        post.published_at = datetime.utcnow()
    session.add(post)
    session.commit()
    session.refresh(post)
    return post


@router.put("/{post_id}", response_model=PostRead)
def update_post(
    post_id: int,
    payload: PostUpdate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    post = session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This post no longer exists — it may have been deleted")
    updates = payload.model_dump(exclude_unset=True)
    check_not_stale(post.updated_at, updates.pop("expected_updated_at", None))
    if updates.get("slug") == post.slug:
        updates.pop("slug")  # unchanged: don't re-validate an address that's already live
    updates = _clean(updates)
    if "slug" in updates:
        clash = session.exec(select(Post).where(Post.slug == updates["slug"])).first()
        if clash:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A post with this slug already exists")
    was_published = post.status == "published"
    for field, value in updates.items():
        setattr(post, field, value)
    if post.status == "published" and not was_published:
        post.published_at = datetime.utcnow()
    post.updated_at = datetime.utcnow()
    session.add(post)
    session.commit()
    session.refresh(post)
    return post


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_editor),
):
    post = session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    session.delete(post)
    session.commit()
