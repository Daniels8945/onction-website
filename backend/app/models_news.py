from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Post(SQLModel, table=True):
    """A news/insights article — Market News, Company News, Press, etc.
    Body is simple paragraph text (one per line), same convention as the
    page builder's richtext block, so authoring stays fast without needing
    the full block editor for what's usually a short write-up."""

    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    category: str = Field(default="Market News")
    summary: str = Field(default="", max_length=400)
    cover_image_url: Optional[str] = None
    body: str = Field(default="")
    status: str = Field(default="draft")  # "draft" | "published"
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PostCreate(SQLModel):
    slug: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(default="Market News", max_length=80)
    summary: str = Field(default="", max_length=400)
    cover_image_url: Optional[str] = None
    body: str = Field(default="")
    status: str = Field(default="draft")


class PostUpdate(SQLModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    cover_image_url: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None


class PostRead(SQLModel):
    id: int
    slug: str
    title: str
    category: str
    summary: str
    cover_image_url: Optional[str]
    body: str
    status: str
    published_at: Optional[datetime]
    updated_at: datetime


class PostListItem(SQLModel):
    id: int
    slug: str
    title: str
    category: str
    summary: str
    cover_image_url: Optional[str]
    status: str
    published_at: Optional[datetime]
