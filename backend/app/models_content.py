from datetime import datetime
from typing import Optional

from sqlalchemy import Column, JSON
from sqlmodel import SQLModel, Field, Relationship


class Page(SQLModel, table=True):
    """A page the public site can render, built from an ordered list of
    Blocks. `slug` is the URL path, e.g. "about" -> /about."""

    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    meta_description: Optional[str] = Field(default=None, max_length=300)
    status: str = Field(default="draft")  # "draft" | "published"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    blocks: list["Block"] = Relationship(
        back_populates="page",
        sa_relationship_kwargs={"order_by": "Block.position", "cascade": "all, delete-orphan"},
    )


class Block(SQLModel, table=True):
    """One content block within a page (hero, richtext, image, gallery,
    video, testimonial, cta, metrics, ...). `data` holds the block-specific
    payload as JSON — kept schemaless so the dashboard can add new block
    types without a migration."""

    id: Optional[int] = Field(default=None, primary_key=True)
    page_id: int = Field(foreign_key="page.id")
    type: str
    position: int = Field(default=0)
    data: dict = Field(default_factory=dict, sa_column=Column(JSON))

    page: Optional[Page] = Relationship(back_populates="blocks")


# --- API payload/response shapes -------------------------------------------

class BlockWrite(SQLModel):
    type: str
    position: int
    data: dict = Field(default_factory=dict)


class BlockRead(SQLModel):
    id: int
    type: str
    position: int
    data: dict


class PageCreate(SQLModel):
    slug: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=200)
    meta_description: Optional[str] = Field(default=None, max_length=300)
    status: str = Field(default="draft")


class PageUpdate(SQLModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    meta_description: Optional[str] = None
    status: Optional[str] = None


class PageListItem(SQLModel):
    id: int
    slug: str
    title: str
    status: str
    updated_at: datetime


class PageRead(SQLModel):
    id: int
    slug: str
    title: str
    meta_description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    blocks: list[BlockRead]
