from typing import List, Optional
from domain.contract import Contract, ContractCreate
from persistence.database import get_connection

_SELECT = """
    SELECT c.id, c.professional_id, c.box_id, c.shift, c.day_of_week,
           c.start_month_year, c.duration_months, c.status, c.previous_contract_id,
           COALESCE(NULLIF(u.name,''), u.email), b.name,
           (SELECT COUNT(id) FROM box_payments WHERE contract_id = c.id)
    FROM contracts c
    JOIN users u ON c.professional_id = u.id
    JOIN boxes b ON c.box_id = b.id
"""

class ContractRepository:
    def create(self, contract: ContractCreate) -> Contract:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO contracts (professional_id, box_id, shift, day_of_week, start_month_year, duration_months, status, previous_contract_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (contract.professional_id, contract.box_id, contract.shift, contract.day_of_week,
             contract.start_month_year, contract.duration_months, contract.status, contract.previous_contract_id)
        )
        contract_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self.get_by_id(contract_id)

    def get_by_id(self, contract_id: int) -> Optional[Contract]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(_SELECT + " WHERE c.id = ?", (contract_id,))
        row = cursor.fetchone()
        conn.close()
        return self._map_row(row) if row else None

    def get_active_by_box_day_shift(self, box_id: int, day_of_week: str, shift: str) -> Optional[Contract]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            _SELECT + " WHERE c.box_id = ? AND c.day_of_week = ? AND c.shift = ? AND c.status = 'ACTIVE'",
            (box_id, day_of_week, shift)
        )
        row = cursor.fetchone()
        conn.close()
        return self._map_row(row) if row else None

    def get_all_active(self) -> List[Contract]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(_SELECT + " WHERE c.status = 'ACTIVE' ORDER BY c.box_id, c.day_of_week, c.shift")
        rows = cursor.fetchall()
        conn.close()
        return [self._map_row(row) for row in rows]

    def update_status(self, contract_id: int, status: str) -> Optional[Contract]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE contracts SET status = ? WHERE id = ?", (status, contract_id))
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return self.get_by_id(contract_id) if updated else None

    def count_payments(self, contract_id: int) -> int:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(id) FROM box_payments WHERE contract_id = ?", (contract_id,))
        count = cursor.fetchone()[0]
        conn.close()
        return count

    def _map_row(self, row) -> Contract:
        return Contract(
            id=row[0],
            professional_id=row[1],
            box_id=row[2],
            shift=row[3],
            day_of_week=row[4],
            start_month_year=row[5],
            duration_months=row[6],
            status=row[7],
            previous_contract_id=row[8],
            professional_email=row[9],
            box_name=row[10],
            months_generated=row[11],
        )
