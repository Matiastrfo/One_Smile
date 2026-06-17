from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
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
