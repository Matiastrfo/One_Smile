import json
from typing import List, Optional
from persistence.database import get_connection
from domain.dental_piece import DentalPiece, TreatmentType, TreatmentColor


class DentalPieceRepository:

    def _row_to_piece(self, row) -> DentalPiece:
        faces_raw = row[5] if len(row) > 5 else "[]"
        faces = json.loads(faces_raw) if faces_raw else []
        color_val = row[4] if len(row) > 4 else None
        return DentalPiece(
            id=row[0],
            patient_id=row[1],
            tooth_number=row[2],
            treatment_type=TreatmentType(row[3]) if row[3] else TreatmentType.NONE,
            color=TreatmentColor(color_val) if color_val else None,
            faces=faces,
        )

    def create(self, patient_id: int, tooth_number: int) -> DentalPiece:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO dental_pieces (patient_id, tooth_number, treatment_type, color, faces) VALUES (?, ?, ?, ?, ?)",
            (patient_id, tooth_number, TreatmentType.NONE.value, None, "[]"),
        )
        piece_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self.get_by_id(piece_id)

    def get_by_id(self, piece_id: int) -> Optional[DentalPiece]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, patient_id, tooth_number, treatment_type, color, faces FROM dental_pieces WHERE id = ?",
            (piece_id,),
        )
        row = cursor.fetchone()
        conn.close()
        return self._row_to_piece(row) if row else None

    def get_by_patient_id(self, patient_id: int) -> List[DentalPiece]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, patient_id, tooth_number, treatment_type, color, faces FROM dental_pieces WHERE patient_id = ? ORDER BY tooth_number ASC",
            (patient_id,),
        )
        rows = cursor.fetchall()
        conn.close()
        return [self._row_to_piece(r) for r in rows]

    def update_tooth(self, patient_id: int, tooth_number: int, treatment_type: TreatmentType, color: Optional[TreatmentColor], faces: List[str]) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE dental_pieces SET treatment_type = ?, color = ?, faces = ? WHERE patient_id = ? AND tooth_number = ?",
            (treatment_type.value, color.value if color else None, json.dumps(faces), patient_id, tooth_number),
        )
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return updated
