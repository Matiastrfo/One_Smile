from typing import List, Optional
from domain.box import Box, BoxCreate, BoxUpdate
from persistence.database import get_connection


class BoxRepository:
    def create(self, box: BoxCreate) -> Box:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO boxes (name) VALUES (?)", (box.name,))
        box_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self.get_by_id(box_id)

    def get_all(self) -> List[Box]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM boxes ORDER BY name")
        rows = cursor.fetchall()
        conn.close()
        return [Box(id=row[0], name=row[1]) for row in rows]

    def get_by_id(self, box_id: int) -> Optional[Box]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM boxes WHERE id = ?", (box_id,))
        row = cursor.fetchone()
        conn.close()
        return Box(id=row[0], name=row[1]) if row else None

    def update(self, box_id: int, box: BoxUpdate) -> Optional[Box]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE boxes SET name = ? WHERE id = ?", (box.name, box_id))
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return self.get_by_id(box_id) if updated else None

    def delete(self, box_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM boxes WHERE id = ?", (box_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted
