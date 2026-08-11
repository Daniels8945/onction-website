from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select

from ..database import get_session
from ..models_admin import AdminUser
from ..models_media import MediaAsset, MediaAssetRead
from ..security import get_current_admin
from ..storage import delete_from_bucket, upload_to_bucket

router = APIRouter(prefix="/api/media", tags=["media"])


@router.post("", response_model=MediaAssetRead, status_code=201)
async def upload_media(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    key, url, size = await upload_to_bucket(file)
    asset = MediaAsset(
        key=key,
        url=url,
        original_filename=file.filename or key,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=size,
        uploaded_by_id=current.id,
    )
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.get("", response_model=list[MediaAssetRead])
def list_media(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    rows = session.exec(select(MediaAsset).order_by(MediaAsset.created_at.desc())).all()
    return rows


@router.delete("/{asset_id}", status_code=204)
def delete_media(
    asset_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    asset = session.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    delete_from_bucket(asset.key)
    session.delete(asset)
    session.commit()
