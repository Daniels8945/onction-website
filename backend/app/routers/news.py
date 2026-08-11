from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..database import get_session
from ..models_admin import AdminUser
from ..models_news import Post, PostCreate, PostListItem, PostRead, PostUpdate
from ..security import get_current_admin

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
    current: AdminUser = Depends(get_current_admin),
):
    existing = session.exec(select(Post).where(Post.slug == payload.slug)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A post with this slug already exists")
    post = Post(**payload.model_dump())
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
    current: AdminUser = Depends(get_current_admin),
):
    post = session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    updates = payload.model_dump(exclude_unset=True)
    if "slug" in updates and updates["slug"] != post.slug:
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
    current: AdminUser = Depends(get_current_admin),
):
    post = session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    session.delete(post)
    session.commit()
