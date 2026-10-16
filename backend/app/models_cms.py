"""Website content managed from the dashboard (see cms_schema.py for what
each document holds, and routers/cms.py for the publishing workflow).

One ContentDoc per content area — "Homepage: hero slides", "Company & contact
details", "Leadership profiles" … Each keeps two copies:

  draft      what editors are working on; never shown to the public
  published  what the website shows; changes only through POST …/publish

A document with nothing published leaves the website on its built-in
content, so the site never depends on the CMS having been filled in.
Every publish, unpublish, restore and discard is kept as a ContentRevision,
which is both the audit trail and the recovery path.
"""
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class ContentDoc(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)  # collection key, e.g. "home.hero"
    draft: Optional[dict] = Field(default=None, sa_column=Column(JSON(none_as_null=True)))
    published: Optional[dict] = Field(default=None, sa_column=Column(JSON(none_as_null=True)))
    # Increments on every draft save; a save must name the rev it was based on,
    # so two editors can't silently overwrite each other (409 instead).
    rev: int = Field(default=0)
    version: int = Field(default=0)  # increments on every publish
    draft_updated_at: Optional[datetime] = None
    draft_updated_by: Optional[str] = None
    published_at: Optional[datetime] = None
    published_by: Optional[str] = None


class ContentRevision(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True)
    version: int  # the published version this revision produced (or refers to)
    action: str  # publish | unpublish | restore | discard
    data: Optional[dict] = Field(default=None, sa_column=Column(JSON(none_as_null=True)))
    note: Optional[str] = Field(default=None, max_length=300)
    by: Optional[str] = None
    at: datetime = Field(default_factory=datetime.utcnow)


# --- API shapes ---------------------------------------------------------------

class DraftWrite(SQLModel):
    data: dict
    rev: int  # the rev the editor loaded


class PublishRequest(SQLModel):
    rev: int
    confirm: bool = False
    note: Optional[str] = Field(default=None, max_length=300)


class DocRead(SQLModel):
    key: str
    draft: Optional[dict]
    published: Optional[dict]
    rev: int
    version: int
    draft_updated_at: Optional[datetime]
    draft_updated_by: Optional[str]
    published_at: Optional[datetime]
    published_by: Optional[str]
    issues: list[dict[str, Any]] = []
