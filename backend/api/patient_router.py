from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from typing import List, Optional
import os, shutil, uuid
from domain.patient import Patient
from domain.user import User
from services.patient_service import PatientService
from api.dependencies import get_current_user, require_admin
from services.odontogram_service import OdontogramService
from domain.dental_piece import DentalPiece, ToothTreatmentCreate, ToothUpdate
from domain.patient_report import PatientReport
from domain.treatment import Treatment
from domain.medical_report import MedicalReport

router = APIRouter()
patient_service = PatientService()

@router.post("/", response_model=Patient)
def create_patient(patient: Patient, current_user: User = Depends(get_current_user)):
    patient.professional_id = current_user.id
    return patient_service.create_patient(patient)

@router.get("/", response_model=List[Patient])
def get_patients(search: Optional[str] = None, current_user: User = Depends(get_current_user)):
    return patient_service.get_all_patients(search, professional_id=current_user.id)



@router.get("/{patient_id}/report", response_model=PatientReport)
def get_patient_report(patient_id: int, current_user: User = Depends(get_current_user)):
    try:
        return patient_service.get_patient_report(patient_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{patient_id}/treatments", response_model=Treatment)
def add_treatment(patient_id: int, treatment: Treatment, current_user: User = Depends(get_current_user)):
    treatment.patient_id = patient_id
    treatment.professional_id = current_user.id
    return patient_service.add_treatment(treatment)

@router.put("/{patient_id}/treatments/{treatment_id}", response_model=Treatment)
def update_treatment(patient_id: int, treatment_id: int, treatment: Treatment, current_user: User = Depends(get_current_user)):
    treatment.patient_id = patient_id
    return patient_service.update_treatment(treatment_id, treatment)

@router.delete("/{patient_id}/treatments/{treatment_id}")
def delete_treatment(patient_id: int, treatment_id: int, current_user: User = Depends(get_current_user)):
    patient_service.delete_treatment(patient_id, treatment_id, odontogram_service)
    return {"message": "Tratamiento eliminado"}

@router.post("/{patient_id}/medical-reports", response_model=MedicalReport)
def add_medical_report(patient_id: int, report: MedicalReport, current_user: User = Depends(get_current_user)):
    report.patient_id = patient_id
    report.professional_id = current_user.id
    return patient_service.add_medical_report(report)

@router.put("/{patient_id}", response_model=Patient)
def update_patient(patient_id: int, patient: Patient, current_user: User = Depends(get_current_user)):
    return patient_service.update_patient(patient_id, patient)

@router.delete("/{patient_id}")
def delete_patient(patient_id: int, current_admin: User = Depends(require_admin)):
    patient_service.delete_patient(patient_id)
    return {"message": "Paciente eliminado"}

PATIENT_PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "patients")
os.makedirs(PATIENT_PHOTOS_DIR, exist_ok=True)

@router.post("/{patient_id}/photo", response_model=Patient)
def upload_patient_photo(patient_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    patient = patient_service.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    ext = os.path.splitext(file.filename or "photo.jpg")[1].lower() or ".jpg"
    filename = f"{patient_id}_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(PATIENT_PHOTOS_DIR, filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    patient.photo_path = f"/uploads/patients/{filename}"
    patient_service.update_patient(patient_id, patient)
    return patient



odontogram_service = OdontogramService()

@router.get("/{patient_id}/odontogram", response_model=List[DentalPiece])
def get_odontogram(patient_id: int, current_user: User = Depends(get_current_user)):
    return odontogram_service.get_odontogram(patient_id)

@router.put("/{patient_id}/odontogram/pieces/{tooth_number}")
def update_tooth(patient_id: int, tooth_number: int, data: ToothUpdate, current_user: User = Depends(get_current_user)):
    odontogram_service.update_tooth(
        patient_id=patient_id,
        tooth_number=tooth_number,
        treatment_type=data.treatment_type,
        color=data.color,
        faces=data.faces,
    )
    return {"message": "ok"}
