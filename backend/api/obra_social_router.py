import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from domain.user import User
from api.dependencies import get_current_user
from persistence.obra_social_repository import ObraSocialRepository

router = APIRouter()

obra_social_repo = ObraSocialRepository()

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "obras_sociales")
os.makedirs(UPLOADS_DIR, exist_ok=True)


class ObraSocialCreate(BaseModel):
    name: str


class ObraSocialOut(BaseModel):
    id: int
    name: str
    is_custom: bool
    arancel_path: Optional[str] = None
    norma_path: Optional[str] = None


def _catalog_entry_out(entry, uploads_map: dict) -> ObraSocialOut:
    upload = uploads_map.get(entry.id, {})
    return ObraSocialOut(
        id=entry.id, name=entry.name, is_custom=False,
        arancel_path=upload.get("arancel_path"), norma_path=upload.get("norma_path"),
    )


def _custom_entry_out(entry) -> ObraSocialOut:
    return ObraSocialOut(
        id=entry.id, name=entry.name, is_custom=True,
        arancel_path=entry.arancel_path, norma_path=entry.norma_path,
    )


@router.get("", response_model=List[ObraSocialOut])
def list_obras_sociales(current_user: User = Depends(get_current_user)):
    catalog = obra_social_repo.get_catalog()
    uploads_map = obra_social_repo.get_uploads_by_professional(current_user.id)
    custom = obra_social_repo.get_custom_by_professional(current_user.id)
    items = [_catalog_entry_out(c, uploads_map) for c in catalog] + [_custom_entry_out(c) for c in custom]
    items.sort(key=lambda o: o.name.lower())
    return items


@router.post("", response_model=ObraSocialOut)
def create_obra_social(body: ObraSocialCreate, current_user: User = Depends(get_current_user)):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    entry = obra_social_repo.create_custom(body.name.strip(), current_user.id)
    return _custom_entry_out(entry)


@router.delete("/{obra_social_id}")
def delete_obra_social(obra_social_id: int, current_user: User = Depends(get_current_user)):
    entry = obra_social_repo.get_by_id(obra_social_id)
    if not entry or not entry.is_custom or entry.professional_id != current_user.id:
        raise HTTPException(status_code=404, detail="Obra social personalizada no encontrada")
    _remove_file(entry.arancel_path)
    _remove_file(entry.norma_path)
    obra_social_repo.delete_custom(obra_social_id, current_user.id)
    return {"message": "Obra social eliminada"}


def _remove_file(rel_path: Optional[str]):
    if not rel_path:
        return
    abs_path = os.path.join(os.path.dirname(__file__), "..", rel_path.lstrip("/"))
    if os.path.exists(abs_path):
        try:
            os.remove(abs_path)
        except OSError:
            pass


def _resolve_target(obra_social_id: int, current_user: User):
    entry = obra_social_repo.get_by_id(obra_social_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Obra social no encontrada")
    if entry.professional_id is not None and entry.professional_id != current_user.id:
        raise HTTPException(status_code=404, detail="Obra social no encontrada")
    return entry


def _save_pdf(file: UploadFile, obra_social_id: int) -> str:
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo tiene que ser un PDF")
    filename = f"{obra_social_id}_{uuid.uuid4().hex}.pdf"
    dest = os.path.join(UPLOADS_DIR, filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/uploads/obras_sociales/{filename}"


@router.post("/{obra_social_id}/arancel", response_model=ObraSocialOut)
def upload_arancel(obra_social_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    entry = _resolve_target(obra_social_id, current_user)
    new_path = _save_pdf(file, obra_social_id)

    if entry.is_custom:
        _remove_file(entry.arancel_path)
        obra_social_repo.update_custom_file(obra_social_id, current_user.id, "arancel_path", new_path)
        return _custom_entry_out(obra_social_repo.get_by_id(obra_social_id))

    existing = obra_social_repo.get_upload(obra_social_id, current_user.id)
    if existing:
        _remove_file(existing["arancel_path"])
    obra_social_repo.set_upload_file(obra_social_id, current_user.id, "arancel_path", new_path)
    uploads_map = obra_social_repo.get_uploads_by_professional(current_user.id)
    return _catalog_entry_out(entry, uploads_map)


@router.post("/{obra_social_id}/norma", response_model=ObraSocialOut)
def upload_norma(obra_social_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    entry = _resolve_target(obra_social_id, current_user)
    new_path = _save_pdf(file, obra_social_id)

    if entry.is_custom:
        _remove_file(entry.norma_path)
        obra_social_repo.update_custom_file(obra_social_id, current_user.id, "norma_path", new_path)
        return _custom_entry_out(obra_social_repo.get_by_id(obra_social_id))

    existing = obra_social_repo.get_upload(obra_social_id, current_user.id)
    if existing:
        _remove_file(existing["norma_path"])
    obra_social_repo.set_upload_file(obra_social_id, current_user.id, "norma_path", new_path)
    uploads_map = obra_social_repo.get_uploads_by_professional(current_user.id)
    return _catalog_entry_out(entry, uploads_map)


@router.delete("/{obra_social_id}/arancel", response_model=ObraSocialOut)
def delete_arancel(obra_social_id: int, current_user: User = Depends(get_current_user)):
    entry = _resolve_target(obra_social_id, current_user)

    if entry.is_custom:
        _remove_file(entry.arancel_path)
        obra_social_repo.update_custom_file(obra_social_id, current_user.id, "arancel_path", None)
        return _custom_entry_out(obra_social_repo.get_by_id(obra_social_id))

    existing = obra_social_repo.get_upload(obra_social_id, current_user.id)
    if existing:
        _remove_file(existing["arancel_path"])
        obra_social_repo.set_upload_file(obra_social_id, current_user.id, "arancel_path", None)
    uploads_map = obra_social_repo.get_uploads_by_professional(current_user.id)
    return _catalog_entry_out(entry, uploads_map)


@router.delete("/{obra_social_id}/norma", response_model=ObraSocialOut)
def delete_norma(obra_social_id: int, current_user: User = Depends(get_current_user)):
    entry = _resolve_target(obra_social_id, current_user)

    if entry.is_custom:
        _remove_file(entry.norma_path)
        obra_social_repo.update_custom_file(obra_social_id, current_user.id, "norma_path", None)
        return _custom_entry_out(obra_social_repo.get_by_id(obra_social_id))

    existing = obra_social_repo.get_upload(obra_social_id, current_user.id)
    if existing:
        _remove_file(existing["norma_path"])
        obra_social_repo.set_upload_file(obra_social_id, current_user.id, "norma_path", None)
    uploads_map = obra_social_repo.get_uploads_by_professional(current_user.id)
    return _catalog_entry_out(entry, uploads_map)
