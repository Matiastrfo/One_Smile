from typing import List
from domain.account_entry import AccountEntry
from persistence.database import get_connection

class AccountEntryRepository:
    def insert(self, entry: AccountEntry) -> AccountEntry:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO account_entries (patient_id, professional_id, date, detail, debe, haber) VALUES (?, ?, ?, ?, ?, ?)",
            (entry.patient_id, entry.professional_id, entry.date, entry.detail, entry.debe, entry.haber)
        )
        entry.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return entry

    def get_by_patient(self, patient_id: int) -> List[AccountEntry]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT ae.id, ae.patient_id, ae.professional_id, ae.date, ae.detail, ae.debe, ae.haber,
                   COALESCE(NULLIF(u.name,''), u.email)
            FROM account_entries ae
            LEFT JOIN users u ON ae.professional_id = u.id
            WHERE ae.patient_id = ?
            ORDER BY ae.date ASC, ae.id ASC
        """, (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        return [AccountEntry(id=r[0], patient_id=r[1], professional_id=r[2], date=r[3],
                             detail=r[4], debe=r[5], haber=r[6], professional_name=r[7]) for r in rows]

    def delete(self, entry_id: int) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM account_entries WHERE id = ?", (entry_id,))
        conn.commit()
        conn.close()

    def get_summary_all_patients(self, professional_id: int = None) -> List[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        where = "WHERE p.professional_id = ?" if professional_id else ""
        params = (professional_id,) if professional_id else ()
        cursor.execute(f"""
            SELECT p.id, p.name, p.last_name, p.dni,
                COALESCE(tc.total, 0) AS total_debe,
                COALESCE(tp.total, 0) AS total_haber
            FROM patients p
            LEFT JOIN (SELECT patient_id, SUM(debe) AS total FROM account_entries GROUP BY patient_id) tc ON tc.patient_id = p.id
            LEFT JOIN (SELECT patient_id, SUM(haber) AS total FROM account_entries GROUP BY patient_id) tp ON tp.patient_id = p.id
            {where}
            ORDER BY p.name ASC
        """, params)
        rows = cursor.fetchall()
        conn.close()
        return [{"patient_id": r[0], "patient_name": r[1], "last_name": r[2], "dni": r[3],
                 "total_debe": r[4], "total_haber": r[5], "balance": r[4] - r[5]} for r in rows]
