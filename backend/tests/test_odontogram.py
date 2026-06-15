import pytest
from persistence.database import init_db
from persistence.user_repository import UserRepository
from persistence.patient_repository import PatientRepository
from services.odontogram_service import OdontogramService
from domain.user import UserInDB
from domain.patient import Patient
from domain.dental_piece import DentalPieceCondition
import uuid

@pytest.fixture(autouse=True)
def setup_teardown():
    # Setup
    # Normally we would use a test db, but here we just ensure tables exist
    init_db()
    yield
    # We could truncate tables here if we were using a real test framework

def test_get_initial_odontogram():
    user_repo = UserRepository()
    patient_repo = PatientRepository()
    service = OdontogramService()

    # Create admin to satisfy relations
    uid = uuid.uuid4().hex[:6]
    user = user_repo.create(UserInDB(email=f"testodo_{uid}@test.com", password_hash="pwd", role="admin"))
    
    # Create patient
    patient = patient_repo.insert(Patient(name="Odo Patient", dni=f"ODO{uid}"))
    
    # Getting the odontogram should return 32 teeth
    pieces = service.get_odontogram(patient.id)
    assert len(pieces) == 32
    assert pieces[0].condition == DentalPieceCondition.HEALTHY
    
    # Getting again should return the same 32 teeth from the database
    pieces_again = service.get_odontogram(patient.id)
    assert len(pieces_again) == 32

def test_update_tooth_condition_and_add_treatment():
    patient_repo = PatientRepository()
    user_repo = UserRepository()
    service = OdontogramService()

    uid = uuid.uuid4().hex[:6]
    user = user_repo.create(UserInDB(email=f"testdoc_{uid}@test.com", password_hash="pwd", role="admin"))
    patient = patient_repo.insert(Patient(name="Treatment Patient", dni=f"TRT{uid}"))
    
    # Initialize 32 teeth
    service.get_odontogram(patient.id)

    # Add a treatment to tooth 18, changing status to CARIES
    service.record_tooth_treatment(
        patient_id=patient.id,
        tooth_number=18,
        professional_id=user.id,
        condition=DentalPieceCondition.CARIES,
        description="Detección de caries profunda",
        price=1500.0
    )

    # Verify condition updated
    pieces = service.get_odontogram(patient.id)
    tooth_18 = next(p for p in pieces if p.tooth_number == 18)
    assert tooth_18.condition == DentalPieceCondition.CARIES

    # Verify treatment created
    treatments = service.get_tooth_treatments(patient.id, 18)
    assert len(treatments) == 1
    assert treatments[0].description == "Detección de caries profunda"
    assert treatments[0].tooth_number == 18
