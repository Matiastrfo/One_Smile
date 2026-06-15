from typing import List, Optional
from domain.box import Box, BoxCreate, BoxUpdate
from persistence.database import get_connection

class BoxRepository:
    def create(self, box: BoxCreate) -> Box:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO boxes (name, professional_morning_id, professional_afternoon_id, contract_duration_morning, contract_duration_afternoon, specialty_morning, specialty_afternoon)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (box.name, box.professional_morning_id, box.professional_afternoon_id, box.contract_duration_morning, box.contract_duration_afternoon, box.specialty_morning, box.specialty_afternoon)
        )
        box_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self.get_by_id(box_id)

    def get_all(self) -> List[Box]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.id, b.name, b.professional_morning_id, b.professional_afternoon_id, 
                   b.contract_duration_morning, b.contract_duration_afternoon,
                   b.specialty_morning, b.specialty_afternoon,
                   u1.email as morning_email, u2.email as afternoon_email
            FROM boxes b
            LEFT JOIN users u1 ON b.professional_morning_id = u1.id
            LEFT JOIN users u2 ON b.professional_afternoon_id = u2.id
        """)
        rows = cursor.fetchall()
        conn.close()

        boxes = []
        for row in rows:
            boxes.append(Box(
                id=row[0],
                name=row[1],
                professional_morning_id=row[2],
                professional_afternoon_id=row[3],
                contract_duration_morning=row[4],
                contract_duration_afternoon=row[5],
                specialty_morning=row[6],
                specialty_afternoon=row[7],
                professional_morning_email=row[8],
                professional_afternoon_email=row[9]
            ))
        return boxes

    def get_by_id(self, box_id: int) -> Optional[Box]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.id, b.name, b.professional_morning_id, b.professional_afternoon_id, 
                   b.contract_duration_morning, b.contract_duration_afternoon,
                   b.specialty_morning, b.specialty_afternoon,
                   u1.email as morning_email, u2.email as afternoon_email
            FROM boxes b
            LEFT JOIN users u1 ON b.professional_morning_id = u1.id
            LEFT JOIN users u2 ON b.professional_afternoon_id = u2.id
            WHERE b.id = ?
        """, (box_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return Box(
                id=row[0],
                name=row[1],
                professional_morning_id=row[2],
                professional_afternoon_id=row[3],
                contract_duration_morning=row[4],
                contract_duration_afternoon=row[5],
                specialty_morning=row[6],
                specialty_afternoon=row[7],
                professional_morning_email=row[8],
                professional_afternoon_email=row[9]
            )
        return None

    def update(self, box_id: int, box: BoxUpdate) -> Optional[Box]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE boxes
            SET name = ?, professional_morning_id = ?, professional_afternoon_id = ?, 
                contract_duration_morning = ?, contract_duration_afternoon = ?,
                specialty_morning = ?, specialty_afternoon = ?
            WHERE id = ?
            """,
            (box.name, box.professional_morning_id, box.professional_afternoon_id, 
             box.contract_duration_morning, box.contract_duration_afternoon, 
             box.specialty_morning, box.specialty_afternoon, box_id)
        )
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        if updated:
            return self.get_by_id(box_id)
        return None

    def delete(self, box_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM boxes WHERE id = ?", (box_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted
