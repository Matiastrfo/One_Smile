from persistence.box_repository import BoxRepository
from persistence.box_payment_repository import BoxPaymentRepository
from domain.box_payment import BoxPaymentCreate
from persistence.database import get_connection

class PaymentService:
    def __init__(self):
        self.box_repo = BoxRepository()
        self.payment_repo = BoxPaymentRepository()

    def generate_monthly_payments(self, target_month_year: str) -> int:
        """
        Evalúa todos los boxes y genera un pago pendiente para el mes indicado,
        siempre que el profesional tenga un contrato activo.
        Retorna la cantidad de pagos generados.
        """
        boxes = self.box_repo.get_all()
        generated_count = 0
        
        conn = get_connection()
        cursor = conn.cursor()
        
        for box in boxes:
            # Shift Morning
            if box.professional_morning_id:
                # Verificar cuántos pagos ya se han generado para este profesional en este box/turno
                cursor.execute(
                    "SELECT COUNT(id) FROM box_payments WHERE box_id = ? AND shift = 'MORNING' AND professional_id = ?",
                    (box.id, box.professional_morning_id)
                )
                count_existing = cursor.fetchone()[0]

                if count_existing < box.contract_duration_morning:
                    # Comprobar si ya existe el pago para este mes, shift y box
                    cursor.execute(
                        "SELECT id FROM box_payments WHERE box_id = ? AND shift = 'MORNING' AND month_year = ?",
                        (box.id, target_month_year)
                    )
                    if not cursor.fetchone():
                        # No existe, crear PENDING
                        self.payment_repo.create(BoxPaymentCreate(
                            professional_id=box.professional_morning_id,
                            box_id=box.id,
                            shift='MORNING',
                            month_year=target_month_year,
                            status='PENDING'
                        ))
                        generated_count += 1
            
            # Shift Afternoon
            if box.professional_afternoon_id:
                # Verificar cuántos pagos ya se han generado para este profesional en este box/turno
                cursor.execute(
                    "SELECT COUNT(id) FROM box_payments WHERE box_id = ? AND shift = 'AFTERNOON' AND professional_id = ?",
                    (box.id, box.professional_afternoon_id)
                )
                count_existing = cursor.fetchone()[0]

                if count_existing < box.contract_duration_afternoon:
                    cursor.execute(
                        "SELECT id FROM box_payments WHERE box_id = ? AND shift = 'AFTERNOON' AND month_year = ?",
                        (box.id, target_month_year)
                    )
                    if not cursor.fetchone():
                        self.payment_repo.create(BoxPaymentCreate(
                            professional_id=box.professional_afternoon_id,
                            box_id=box.id,
                            shift='AFTERNOON',
                            month_year=target_month_year,
                            status='PENDING'
                        ))
                        generated_count += 1

        conn.close()
        return generated_count
