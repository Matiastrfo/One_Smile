from pydantic import BaseModel
from typing import List
from domain.patient import Patient
from domain.appointment import Appointment
from domain.treatment import Treatment
from domain.medical_report import MedicalReport

class PatientReport(BaseModel):
    patient: Patient
    appointments: List[Appointment]
    treatments: List[Treatment]
    medical_reports: List[MedicalReport]
