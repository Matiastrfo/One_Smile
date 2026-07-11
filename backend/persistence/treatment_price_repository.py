from domain.treatment_price import TreatmentPrice
from persistence.database import get_connection

class TreatmentPriceRepository:
    def get_by_professional(self, professional_id: int) -> list[TreatmentPrice]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT treatment_type, price FROM treatment_prices WHERE professional_id = ?",
            (professional_id,)
        )
        rows = cursor.fetchall()
        conn.close()
        return [TreatmentPrice(treatment_type=r[0], price=r[1]) for r in rows]

    def save_all(self, professional_id: int, prices: list[TreatmentPrice]) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        for p in prices:
            cursor.execute(
                """INSERT INTO treatment_prices (professional_id, treatment_type, price)
                   VALUES (?, ?, ?)
                   ON CONFLICT(professional_id, treatment_type) DO UPDATE SET price = excluded.price""",
                (professional_id, p.treatment_type, p.price)
            )
        conn.commit()
        conn.close()
