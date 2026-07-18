import os
import uuid
import shutil
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from domain.user import User
from domain.lab import Lab, LabJob
from api.dependencies import get_current_user
from persistence.lab_repository import LabRepository, LabJobRepository
from services.email_service import send_lab_job_notification
from uploads_path import UPLOADS_DIR

router = APIRouter()

lab_repo = LabRepository()
job_repo = LabJobRepository()

PRICE_LISTS_DIR = os.path.join(UPLOADS_DIR, "labs")
os.makedirs(PRICE_LISTS_DIR, exist_ok=True)


class LabCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class LabJobCreate(BaseModel):
    lab_id: int
    patient_id: int
    description: str
    sent_date: Optional[str] = None
    notes: Optional[str] = None


@router.get("", response_model=List[Lab])
def list_labs(current_user: User = Depends(get_current_user)):
    return lab_repo.get_all()


@router.post("", response_model=Lab)
def create_lab(body: LabCreate, current_user: User = Depends(get_current_user)):
    lab = Lab(name=body.name, phone=body.phone, email=body.email, created_at=str(date.today()))
    return lab_repo.create(lab)


@router.put("/{lab_id}", response_model=Lab)
def update_lab(lab_id: int, body: LabCreate, current_user: User = Depends(get_current_user)):
    updated = lab_repo.update(lab_id, body.name, body.phone, body.email)
    if not updated:
        raise HTTPException(status_code=404, detail="Laboratorio no encontrado")
    return updated


@router.delete("/{lab_id}")
def delete_lab(lab_id: int, current_user: User = Depends(get_current_user)):
    if not lab_repo.delete(lab_id):
        raise HTTPException(status_code=404, detail="Laboratorio no encontrado")
    return {"message": "Laboratorio eliminado"}


@router.post("/{lab_id}/price-list", response_model=Lab)
def upload_price_list(lab_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    lab = lab_repo.get_by_id(lab_id)
    if not lab:
        raise HTTPException(status_code=404, detail="Laboratorio no encontrado")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="La lista de precios tiene que ser un PDF")
    filename = f"{lab_id}_{uuid.uuid4().hex}.pdf"
    dest = os.path.join(PRICE_LISTS_DIR, filename)
    os.makedirs(PRICE_LISTS_DIR, exist_ok=True)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    lab_repo.update_price_list(lab_id, f"/uploads/labs/{filename}")
    return lab_repo.get_by_id(lab_id)


@router.get("/jobs", response_model=List[LabJob])
def list_jobs(lab_id: Optional[int] = None, patient_id: Optional[int] = None, current_user: User = Depends(get_current_user)):
    if lab_id:
        return job_repo.get_by_lab(lab_id)
    if patient_id:
        return job_repo.get_by_patient(patient_id)
    return job_repo.get_all()


@router.post("/jobs", response_model=LabJob)
def create_job(body: LabJobCreate, current_user: User = Depends(get_current_user)):
    lab = lab_repo.get_by_id(body.lab_id)
    if not lab:
        raise HTTPException(status_code=404, detail="Laboratorio no encontrado")

    job = LabJob(
        lab_id=body.lab_id,
        patient_id=body.patient_id,
        professional_id=current_user.id,
        description=body.description,
        sent_date=body.sent_date or str(date.today()),
        notes=body.notes,
    )
    created = job_repo.create(job)

    if lab.email:
        send_lab_job_notification(
            lab.email, lab.name, created.patient_name or "", created.description,
            created.sent_date, created.professional_name or current_user.email,
        )

    return created


@router.patch("/jobs/{job_id}/receive", response_model=LabJob)
def mark_job_received(job_id: int, current_user: User = Depends(get_current_user)):
    job = job_repo.mark_received(job_id, str(date.today()))
    if not job:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    return job


@router.delete("/jobs/{job_id}")
def delete_job(job_id: int, current_user: User = Depends(get_current_user)):
    if not job_repo.delete(job_id):
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    return {"message": "Trabajo eliminado"}
