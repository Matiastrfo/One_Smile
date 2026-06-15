import pytest
from datetime import datetime
from domain.box import Box, BoxCreate
from domain.box_payment import BoxPayment
from services.payment_service import PaymentService
from persistence.box_repository import BoxRepository
from persistence.box_payment_repository import BoxPaymentRepository
from persistence.database import init_db, get_connection

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    # Limpiar tablas para cada test
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM box_payments")
    c.execute("DELETE FROM boxes")
    c.execute("DELETE FROM users WHERE email != 'admin@admin.com'")
    conn.commit()
    conn.close()

def test_generate_monthly_payments():
    # Insertar un usuario y un box
    conn = get_connection()
    c = conn.cursor()
    c.execute("INSERT INTO users (email, password_hash, role) VALUES ('test@prof.com', 'hash', 'profesional')")
    prof_id = c.lastrowid
    conn.commit()
    
    box_repo = BoxRepository()
    box = box_repo.create(BoxCreate(
        name="Box Test",
        professional_morning_id=prof_id,
        contract_duration_morning=3 # contrato de 3 meses
    ))
    
    payment_service = PaymentService()
    
    # Simular ejecución del mes actual
    current_month = datetime.now().strftime('%Y-%m')
    payments_generated = payment_service.generate_monthly_payments(current_month)
    
    assert payments_generated > 0
    
    # Verificar que el pago se creó correctamente
    payment_repo = BoxPaymentRepository()
    payments = payment_repo.get_by_professional_id(prof_id)
    
    assert len(payments) == 1
    assert payments[0].status == "PENDING"
    assert payments[0].shift == "MORNING"
    assert payments[0].month_year == current_month

def test_update_payment_status():
    conn = get_connection()
    c = conn.cursor()
    c.execute("INSERT INTO users (email, password_hash, role) VALUES ('test2@prof.com', 'hash', 'profesional')")
    prof_id = c.lastrowid
    
    c.execute("INSERT INTO boxes (name) VALUES ('Box 2')")
    box_id = c.lastrowid
    
    c.execute("INSERT INTO box_payments (professional_id, box_id, shift, month_year, status) VALUES (?, ?, 'MORNING', '2026-06', 'PENDING')", (prof_id, box_id))
    payment_id = c.lastrowid
    conn.commit()
    conn.close()
    
    payment_repo = BoxPaymentRepository()
    from domain.box_payment import BoxPaymentUpdate
    updated = payment_repo.update(payment_id, BoxPaymentUpdate(status="PAID", amount=150.0))
    
    assert updated is not None
    assert updated.status == "PAID"
    assert updated.amount == 150.0
