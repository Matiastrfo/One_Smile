from typing import List, Optional
from domain.promotion import Promotion
from persistence.database import get_connection

_COLS = "id, professional_id, title, category, message, file_path, created_at"


def _map(r) -> Promotion:
    return Promotion(id=r[0], professional_id=r[1], title=r[2], category=r[3],
                     message=r[4], file_path=r[5], created_at=r[6])


class PromotionRepository:
    def insert(self, promo: Promotion) -> Promotion:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO promotions (professional_id, title, category, message, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (promo.professional_id, promo.title, promo.category, promo.message, promo.file_path, promo.created_at),
        )
        promo.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return promo

    def get_by_professional(self, professional_id: int) -> List[Promotion]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT {_COLS} FROM promotions WHERE professional_id = ? ORDER BY id DESC",
            (professional_id,),
        )
        rows = cursor.fetchall()
        conn.close()
        return [_map(r) for r in rows]

    def get_by_id(self, promo_id: int) -> Optional[Promotion]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(f"SELECT {_COLS} FROM promotions WHERE id = ?", (promo_id,))
        row = cursor.fetchone()
        conn.close()
        return _map(row) if row else None

    def update(self, promo_id: int, title: str, category: str, message: Optional[str]) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE promotions SET title = ?, category = ?, message = ? WHERE id = ?",
            (title, category, message, promo_id),
        )
        conn.commit()
        conn.close()

    def delete(self, promo_id: int) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM promotions WHERE id = ?", (promo_id,))
        conn.commit()
        conn.close()
