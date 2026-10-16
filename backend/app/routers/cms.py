"""Website content API — the dashboard's draft → review → publish workflow.

  GET  /api/content/public              published content for the website (no auth)
  GET  /api/content/preview             drafts overlaid on published, for signed-in staff
  GET  /api/content/schema              what's editable and the rules (cms_schema.py)
  GET  /api/content/docs                every content area with its status
  GET  /api/content/docs/{key}          one area: draft, published, problems
  PUT  /api/content/docs/{key}/draft    save a draft (never visible to the public)
  POST /api/content/docs/{key}/publish  validate + publish (explicit confirm, matching rev)
  POST /api/content/docs/{key}/discard  throw the draft away (kept in history)
  POST /api/content/docs/{key}/unpublish  back to the site's built-in content (kept in history)
  GET  /api/content/docs/{key}/history  every publish/unpublish/discard/restore
  POST /api/content/docs/{key}/restore/{revision_id}  load an old version into the draft
  GET  /api/content/coverage            the website-wide coverage report

Viewers can read everything; Admins and Super Admins edit and publish;
"protected" areas (contact details, menu, footer) need a Super Admin to
publish or unpublish.
"""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select

from ..cms_schema import BY_KEY, CODE_MANAGED, COLLECTIONS, EXISTING_ADMIN, public_schema, validate
from ..database import get_session
from ..models_admin import AdminUser
from ..models_cms import ContentDoc, ContentRevision, DocRead, DraftWrite, PublishRequest
from ..security import get_current_admin, require_role

router = APIRouter(prefix="/api/content", tags=["content"])

EDITORS = ("Super Admin", "Admin")
MAX_BYTES = 400_000


def _coll(key: str) -> dict:
    coll = BY_KEY.get(key)
    if not coll:
        raise HTTPException(status_code=404, detail="Unknown content area")
    return coll


def _doc(session: Session, key: str, create: bool = False) -> ContentDoc | None:
    doc = session.exec(select(ContentDoc).where(ContentDoc.key == key)).first()
    if not doc and create:
        doc = ContentDoc(key=key)
        session.add(doc)
        session.flush()
    return doc


def _status(doc: ContentDoc | None) -> str:
    if not doc or (doc.published is None and doc.draft is None):
        return "built-in"  # website shows its original, built-in content
    if doc.published is None:
        return "draft"  # never published (or unpublished) and a draft exists
    return "changes" if doc.draft is not None else "published"


def _read(doc: ContentDoc | None, key: str) -> DocRead:
    data = doc.draft if doc and doc.draft is not None else (doc.published if doc else None)
    return DocRead(
        key=key,
        draft=doc.draft if doc else None,
        published=doc.published if doc else None,
        rev=doc.rev if doc else 0,
        version=doc.version if doc else 0,
        draft_updated_at=doc.draft_updated_at if doc else None,
        draft_updated_by=doc.draft_updated_by if doc else None,
        published_at=doc.published_at if doc else None,
        published_by=doc.published_by if doc else None,
        issues=validate(key, data) if data is not None else [],
    )


def _require_rev(doc: ContentDoc | None, rev: int):
    current = doc.rev if doc else 0
    if rev != current:
        raise HTTPException(status_code=409, detail="Someone else saved this content since you opened it. Reload to see their changes before saving.")


def _require_publisher(coll: dict, admin: AdminUser):
    if coll.get("protected") and admin.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Only a Super Admin can publish changes to this area.")


# ── website ──────────────────────────────────────────────────────────────────
def _public_view(key: str, data: dict) -> dict:
    """Published content minus list items not marked verified: an unapproved
    profile or photo inside a published document never reaches the public."""
    out = dict(data)
    for f in BY_KEY[key]["fields"]:
        if f["type"] == "list" and any(x["name"] == "verified" for x in f["fields"]) and isinstance(out.get(f["name"]), list):
            out[f["name"]] = [i for i in out[f["name"]] if isinstance(i, dict) and i.get("verified") is True]
    return out


@router.get("/public")
def public_content(response: Response, session: Session = Depends(get_session)):
    response.headers["Cache-Control"] = "no-cache"
    docs = session.exec(select(ContentDoc)).all()
    return {d.key: _public_view(d.key, d.published) for d in docs if d.key in BY_KEY and d.published is not None}


@router.get("/preview")
def preview_content(response: Response, session: Session = Depends(get_session), _: AdminUser = Depends(get_current_admin)):
    response.headers["Cache-Control"] = "no-store"
    out = {}
    for d in session.exec(select(ContentDoc)).all():
        if d.key in BY_KEY:
            data = d.draft if d.draft is not None else d.published
            if data is not None:
                out[d.key] = data
    return out


# ── dashboard ────────────────────────────────────────────────────────────────
@router.get("/schema")
def schema(_: AdminUser = Depends(get_current_admin)):
    return public_schema()


@router.get("/docs")
def list_docs(session: Session = Depends(get_session), _: AdminUser = Depends(get_current_admin)):
    docs = {d.key: d for d in session.exec(select(ContentDoc)).all()}
    rows = []
    for c in COLLECTIONS:
        d = docs.get(c["key"])
        data = d.draft if d and d.draft is not None else (d.published if d else None)
        issues = validate(c["key"], data) if data is not None else []
        rows.append({
            "key": c["key"], "label": c["label"], "area": c["area"], "protected": bool(c.get("protected")),
            "used_on": c["used_on"], "status": _status(d), "version": d.version if d else 0,
            "draft_updated_at": d.draft_updated_at if d else None, "draft_updated_by": d.draft_updated_by if d else None,
            "published_at": d.published_at if d else None, "published_by": d.published_by if d else None,
            "errors": sum(1 for i in issues if i["level"] == "error"), "warnings": sum(1 for i in issues if i["level"] == "warning"),
        })
    return rows


@router.post("/validate/{key}")
def validate_only(key: str, body: dict, _: AdminUser = Depends(get_current_admin)):
    """Check content without saving it."""
    _coll(key)
    return {"issues": validate(key, body.get("data") if isinstance(body.get("data"), dict) else {})}


@router.get("/docs/{key}", response_model=DocRead)
def get_doc(key: str, session: Session = Depends(get_session), _: AdminUser = Depends(get_current_admin)):
    _coll(key)
    return _read(_doc(session, key), key)


@router.put("/docs/{key}/draft", response_model=DocRead)
def save_draft(key: str, body: DraftWrite, session: Session = Depends(get_session), admin: AdminUser = Depends(require_role(*EDITORS))):
    _coll(key)
    if len(json.dumps(body.data)) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="This content is too large to save.")
    doc = _doc(session, key, create=True)
    _require_rev(doc, body.rev)
    doc.draft = body.data
    doc.rev += 1
    doc.draft_updated_at = datetime.utcnow()
    doc.draft_updated_by = admin.email
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return _read(doc, key)


@router.post("/docs/{key}/publish", response_model=DocRead)
def publish(key: str, body: PublishRequest, session: Session = Depends(get_session), admin: AdminUser = Depends(require_role(*EDITORS))):
    coll = _coll(key)
    _require_publisher(coll, admin)
    if not body.confirm:
        raise HTTPException(status_code=400, detail="Publishing needs explicit confirmation.")
    doc = _doc(session, key)
    _require_rev(doc, body.rev)
    if not doc or doc.draft is None:
        raise HTTPException(status_code=400, detail="There are no unpublished changes.")
    errors = [i for i in validate(key, doc.draft) if i["level"] == "error"]
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Fix these problems before publishing.", "issues": errors})
    doc.published = doc.draft
    doc.draft = None
    doc.version += 1
    doc.rev += 1
    doc.published_at = datetime.utcnow()
    doc.published_by = admin.email
    session.add(doc)
    session.add(ContentRevision(key=key, version=doc.version, action="publish", data=doc.published, note=body.note, by=admin.email))
    session.commit()
    session.refresh(doc)
    return _read(doc, key)


@router.post("/docs/{key}/discard", response_model=DocRead)
def discard(key: str, body: PublishRequest, session: Session = Depends(get_session), admin: AdminUser = Depends(require_role(*EDITORS))):
    _coll(key)
    doc = _doc(session, key)
    _require_rev(doc, body.rev)
    if not doc or doc.draft is None:
        raise HTTPException(status_code=400, detail="There is no draft to discard.")
    session.add(ContentRevision(key=key, version=doc.version, action="discard", data=doc.draft, by=admin.email))
    doc.draft = None
    doc.rev += 1
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return _read(doc, key)


@router.post("/docs/{key}/unpublish", response_model=DocRead)
def unpublish(key: str, body: PublishRequest, session: Session = Depends(get_session), admin: AdminUser = Depends(require_role(*EDITORS))):
    coll = _coll(key)
    _require_publisher(coll, admin)
    if not body.confirm:
        raise HTTPException(status_code=400, detail="Unpublishing needs explicit confirmation.")
    doc = _doc(session, key)
    _require_rev(doc, body.rev)
    if not doc or doc.published is None:
        raise HTTPException(status_code=400, detail="Nothing is published here.")
    session.add(ContentRevision(key=key, version=doc.version, action="unpublish", data=doc.published, note=body.note, by=admin.email))
    doc.published = None
    doc.rev += 1
    doc.published_at = datetime.utcnow()
    doc.published_by = admin.email
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return _read(doc, key)


@router.get("/docs/{key}/history")
def history(key: str, session: Session = Depends(get_session), _: AdminUser = Depends(get_current_admin)):
    _coll(key)
    revs = session.exec(select(ContentRevision).where(ContentRevision.key == key).order_by(ContentRevision.id.desc())).all()  # type: ignore[union-attr]
    return [{"id": r.id, "version": r.version, "action": r.action, "note": r.note, "by": r.by, "at": r.at, "data": r.data} for r in revs]


@router.post("/docs/{key}/restore/{revision_id}", response_model=DocRead)
def restore(key: str, revision_id: int, body: PublishRequest, session: Session = Depends(get_session), admin: AdminUser = Depends(require_role(*EDITORS))):
    """Loads an old version into the draft. It still goes through review and
    publishing like any other change."""
    _coll(key)
    rev = session.get(ContentRevision, revision_id)
    if not rev or rev.key != key or rev.data is None:
        raise HTTPException(status_code=404, detail="That version can't be found.")
    doc = _doc(session, key, create=True)
    _require_rev(doc, body.rev)
    doc.draft = rev.data
    doc.rev += 1
    doc.draft_updated_at = datetime.utcnow()
    doc.draft_updated_by = admin.email
    session.add(doc)
    session.add(ContentRevision(key=key, version=doc.version, action="restore", data=rev.data, note=f"Restored from {rev.action} of {rev.at:%d %b %Y %H:%M}", by=admin.email))
    session.commit()
    session.refresh(doc)
    return _read(doc, key)


# ── coverage report ──────────────────────────────────────────────────────────
def _capabilities(fields: list) -> set[str]:
    caps = set()
    for f in fields:
        if f["type"] in ("image",):
            caps.add("images")
        if f["type"] == "video" or f["name"] == "youtube":
            caps.add("video")
        if f["type"] == "list" and not f.get("fixed"):
            caps.add("add/remove items")
        if f["type"] == "list":
            caps.add("reorder")
        if f["type"] == "bool" and f["name"] == "verified":
            caps.add("per-item visibility")
        if f.get("fields"):
            caps |= _capabilities(f["fields"])
    return caps


@router.get("/coverage")
def coverage(session: Session = Depends(get_session), _: AdminUser = Depends(get_current_admin)):
    docs = {d.key: d for d in session.exec(select(ContentDoc)).all()}
    managed = []
    for c in COLLECTIONS:
        d = docs.get(c["key"])
        managed.append({
            "key": c["key"], "area": c["area"], "label": c["label"], "pages": [u["label"] for u in c["used_on"]],
            "status": _status(d), "protected": bool(c.get("protected")),
            "fields": sum(1 for _ in _walk(c["fields"])),
            "capabilities": sorted(_capabilities(c["fields"]) | {"drafts", "preview", "publish", "unpublish", "history & restore", "validation", "role permissions"}),
        })
    return {"managed": managed, "existing_admin": EXISTING_ADMIN, "code_managed": CODE_MANAGED}


def _walk(fields):
    for f in fields:
        yield f
        if f.get("fields"):
            yield from _walk(f["fields"])
