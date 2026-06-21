from typing import List, Optional
from domain.budget import Budget, BudgetItem
from persistence.database import get_connection

class BudgetRepository:
    def create(self, budget: Budget) -> Budget:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO budgets (patient_id, professional_id, created_at, notes, status) VALUES (?, ?, ?, ?, ?)",
            (budget.patient_id, budget.professional_id, budget.created_at, budget.notes, budget.status)
        )
        budget.id = cursor.lastrowid
        for item in budget.items:
            cursor.execute(
                "INSERT INTO budget_items (budget_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)",
                (budget.id, item.description, item.quantity, item.unit_price)
            )
        conn.commit()
        conn.close()
        return self.get_by_id(budget.id)

    def get_by_id(self, budget_id: int) -> Optional[Budget]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.id, b.patient_id, b.professional_id, b.created_at, b.notes, b.status,
                   COALESCE(NULLIF(u.name,''), u.email)
            FROM budgets b LEFT JOIN users u ON b.professional_id = u.id
            WHERE b.id = ?
        """, (budget_id,))
        row = cursor.fetchone()
        if not row:
            conn.close(); return None
        budget = Budget(id=row[0], patient_id=row[1], professional_id=row[2],
                        created_at=row[3], notes=row[4], status=row[5], professional_name=row[6])
        cursor.execute("SELECT id, budget_id, description, quantity, unit_price FROM budget_items WHERE budget_id = ?", (budget_id,))
        budget.items = [BudgetItem(id=r[0], budget_id=r[1], description=r[2], quantity=r[3], unit_price=r[4]) for r in cursor.fetchall()]
        conn.close()
        return budget

    def get_by_patient(self, patient_id: int) -> List[Budget]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.id, b.patient_id, b.professional_id, b.created_at, b.notes, b.status,
                   COALESCE(NULLIF(u.name,''), u.email)
            FROM budgets b LEFT JOIN users u ON b.professional_id = u.id
            WHERE b.patient_id = ? ORDER BY b.id DESC
        """, (patient_id,))
        rows = cursor.fetchall()
        budgets = []
        for row in rows:
            b = Budget(id=row[0], patient_id=row[1], professional_id=row[2],
                       created_at=row[3], notes=row[4], status=row[5], professional_name=row[6])
            cursor.execute("SELECT id, budget_id, description, quantity, unit_price FROM budget_items WHERE budget_id = ?", (b.id,))
            b.items = [BudgetItem(id=r[0], budget_id=r[1], description=r[2], quantity=r[3], unit_price=r[4]) for r in cursor.fetchall()]
            budgets.append(b)
        conn.close()
        return budgets

    def update_status(self, budget_id: int, status: str) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE budgets SET status = ? WHERE id = ?", (status, budget_id))
        conn.commit()
        conn.close()

    def delete(self, budget_id: int) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM budget_items WHERE budget_id = ?", (budget_id,))
        cursor.execute("DELETE FROM budgets WHERE id = ?", (budget_id,))
        conn.commit()
        conn.close()
