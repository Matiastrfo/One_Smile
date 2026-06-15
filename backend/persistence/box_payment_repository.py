from typing import List, Optional
from domain.box_payment import BoxPayment, BoxPaymentCreate, BoxPaymentUpdate
from persistence.database import get_connection

class BoxPaymentRepository:
    def create(self, payment: BoxPaymentCreate) -> BoxPayment:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO box_payments (professional_id, box_id, shift, month_year, status, payment_date, amount, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (payment.professional_id, payment.box_id, payment.shift, payment.month_year, 
             payment.status, payment.payment_date, payment.amount, payment.notes)
        )
        payment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self.get_by_id(payment_id)

    def get_by_id(self, payment_id: int) -> Optional[BoxPayment]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.id, p.professional_id, p.box_id, p.shift, p.month_year, p.status, p.payment_date, p.amount, p.notes,
                   u.email as professional_email, b.name as box_name, b.contract_duration_morning, b.contract_duration_afternoon
            FROM box_payments p
            JOIN users u ON p.professional_id = u.id
            JOIN boxes b ON p.box_id = b.id
            WHERE p.id = ?
        """, (payment_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return self._map_row(row)
        return None

    def get_all(self) -> List[BoxPayment]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.id, p.professional_id, p.box_id, p.shift, p.month_year, p.status, p.payment_date, p.amount, p.notes,
                   u.email as professional_email, b.name as box_name, b.contract_duration_morning, b.contract_duration_afternoon
            FROM box_payments p
            JOIN users u ON p.professional_id = u.id
            JOIN boxes b ON p.box_id = b.id
            ORDER BY p.month_year DESC, u.email ASC
        """)
        rows = cursor.fetchall()
        conn.close()
        return [self._map_row(row) for row in rows]

    def get_by_professional_id(self, prof_id: int) -> List[BoxPayment]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.id, p.professional_id, p.box_id, p.shift, p.month_year, p.status, p.payment_date, p.amount, p.notes,
                   u.email as professional_email, b.name as box_name, b.contract_duration_morning, b.contract_duration_afternoon
            FROM box_payments p
            JOIN users u ON p.professional_id = u.id
            JOIN boxes b ON p.box_id = b.id
            WHERE p.professional_id = ?
            ORDER BY p.month_year DESC
        """, (prof_id,))
        rows = cursor.fetchall()
        conn.close()
        return [self._map_row(row) for row in rows]

    def update(self, payment_id: int, payment: BoxPaymentUpdate) -> Optional[BoxPayment]:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        if payment.status is not None:
            update_fields.append("status = ?")
            params.append(payment.status)
        if payment.payment_date is not None:
            update_fields.append("payment_date = ?")
            params.append(payment.payment_date)
        if payment.amount is not None:
            update_fields.append("amount = ?")
            params.append(payment.amount)
        if payment.notes is not None:
            update_fields.append("notes = ?")
            params.append(payment.notes)
            
        if not update_fields:
            return self.get_by_id(payment_id)
            
        params.append(payment_id)
        query = f"UPDATE box_payments SET {', '.join(update_fields)} WHERE id = ?"
        
        cursor.execute(query, tuple(params))
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        if updated:
            return self.get_by_id(payment_id)
        return None
        
    def _map_row(self, row) -> BoxPayment:
        shift = row[3]
        contract_duration = row[11] if shift == 'MORNING' else row[12]
        return BoxPayment(
            id=row[0],
            professional_id=row[1],
            box_id=row[2],
            shift=row[3],
            month_year=row[4],
            status=row[5],
            payment_date=row[6],
            amount=row[7],
            notes=row[8],
            professional_email=row[9],
            box_name=row[10],
            contract_duration=contract_duration
        )
