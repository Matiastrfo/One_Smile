from persistence.box_payment_repository import BoxPaymentRepository
from persistence.contract_repository import ContractRepository
from domain.box_payment import BoxPaymentCreate

class PaymentService:
    def __init__(self):
        self.payment_repo = BoxPaymentRepository()
        self.contract_repo = ContractRepository()

    def generate_monthly_payments(self, target_month_year: str) -> int:
        """
        Evalúa todos los contratos ACTIVOS y genera un pago pendiente para el mes indicado,
        siempre que el contrato no haya agotado su duración.
        Retorna la cantidad de pagos generados.
        """
        generated_count = 0

        for contract in self.contract_repo.get_all_active():
            if contract.months_generated >= contract.duration_months:
                continue

            existing = self.payment_repo.get_by_contract_id(contract.id)
            if any(p.month_year == target_month_year for p in existing):
                continue

            self.payment_repo.create(BoxPaymentCreate(
                professional_id=contract.professional_id,
                box_id=contract.box_id,
                shift=contract.shift,
                month_year=target_month_year,
                status='PENDING',
                contract_id=contract.id,
            ))
            generated_count += 1

        return generated_count
