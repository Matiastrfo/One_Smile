from typing import List, Optional
from domain.obra_social import ObraSocial
from persistence.database import get_connection


class ObraSocialRepository:
    def get_catalog(self) -> List[ObraSocial]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, professional_id, arancel_path, norma_path, is_custom "
            "FROM obras_sociales WHERE professional_id IS NULL ORDER BY name ASC"
        )
        rows = cursor.fetchall()
        conn.close()
        return [self._map(r) for r in rows]

    def get_custom_by_professional(self, professional_id: int) -> List[ObraSocial]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, professional_id, arancel_path, norma_path, is_custom "
            "FROM obras_sociales WHERE professional_id = ? ORDER BY name ASC",
            (professional_id,),
        )
        rows = cursor.fetchall()
        conn.close()
        return [self._map(r) for r in rows]

    def get_by_id(self, obra_social_id: int) -> Optional[ObraSocial]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, professional_id, arancel_path, norma_path, is_custom "
            "FROM obras_sociales WHERE id = ?",
            (obra_social_id,),
        )
        row = cursor.fetchone()
        conn.close()
        return self._map(row) if row else None

    def create_custom(self, name: str, professional_id: int) -> ObraSocial:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO obras_sociales (name, professional_id, is_custom) VALUES (?, ?, 1)",
            (name, professional_id),
        )
        new_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self.get_by_id(new_id)

    def delete_custom(self, obra_social_id: int, professional_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM obras_sociales WHERE id = ? AND professional_id = ? AND is_custom = 1",
            (obra_social_id, professional_id),
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    def update_custom_file(self, obra_social_id: int, professional_id: int, field: str, path: Optional[str]) -> bool:
        """Actualiza arancel_path o norma_path de una entrada personalizada (propia)."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE obras_sociales SET {field} = ? WHERE id = ? AND professional_id = ?",
            (path, obra_social_id, professional_id),
        )
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return updated

    def get_upload(self, obra_social_id: int, professional_id: int) -> Optional[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, obra_social_id, professional_id, arancel_path, norma_path "
            "FROM obra_social_uploads WHERE obra_social_id = ? AND professional_id = ?",
            (obra_social_id, professional_id),
        )
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return {"id": row[0], "obra_social_id": row[1], "professional_id": row[2], "arancel_path": row[3], "norma_path": row[4]}

    def get_uploads_by_professional(self, professional_id: int) -> dict:
        """Mapa obra_social_id -> {arancel_path, norma_path} para este profesional."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT obra_social_id, arancel_path, norma_path FROM obra_social_uploads WHERE professional_id = ?",
            (professional_id,),
        )
        rows = cursor.fetchall()
        conn.close()
        return {r[0]: {"arancel_path": r[1], "norma_path": r[2]} for r in rows}

    def set_upload_file(self, obra_social_id: int, professional_id: int, field: str, path: Optional[str]) -> dict:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO obra_social_uploads (obra_social_id, professional_id, arancel_path, norma_path) "
            "VALUES (?, ?, NULL, NULL) "
            "ON CONFLICT(obra_social_id, professional_id) DO NOTHING",
            (obra_social_id, professional_id),
        )
        cursor.execute(
            f"UPDATE obra_social_uploads SET {field} = ? WHERE obra_social_id = ? AND professional_id = ?",
            (path, obra_social_id, professional_id),
        )
        conn.commit()
        conn.close()
        return self.get_upload(obra_social_id, professional_id)

    def _map(self, r) -> ObraSocial:
        return ObraSocial(
            id=r[0], name=r[1], professional_id=r[2],
            arancel_path=r[3], norma_path=r[4], is_custom=bool(r[5]),
        )
