from typing import List, Optional
from persistence.database import get_connection
from domain.dental_piece import DentalPiece, DentalPieceCreate, DentalPieceCondition

class DentalPieceRepository:
    def create(self, piece: DentalPieceCreate) -> DentalPiece:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO dental_pieces (patient_id, tooth_number, condition)
            VALUES (?, ?, ?)
            """,
            (piece.patient_id, piece.tooth_number, piece.condition.value)
        )
        piece_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self.get_by_id(piece_id)

    def get_by_id(self, piece_id: int) -> Optional[DentalPiece]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, patient_id, tooth_number, condition
            FROM dental_pieces
            WHERE id = ?
        """, (piece_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return DentalPiece(
                id=row[0],
                patient_id=row[1],
                tooth_number=row[2],
                condition=DentalPieceCondition(row[3])
            )
        return None

    def get_by_patient_id(self, patient_id: int) -> List[DentalPiece]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, patient_id, tooth_number, condition
            FROM dental_pieces
            WHERE patient_id = ?
            ORDER BY tooth_number ASC
        """, (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            DentalPiece(
                id=row[0],
                patient_id=row[1],
                tooth_number=row[2],
                condition=DentalPieceCondition(row[3])
            ) for row in rows
        ]

    def update_condition(self, patient_id: int, tooth_number: int, condition: DentalPieceCondition) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE dental_pieces
            SET condition = ?
            WHERE patient_id = ? AND tooth_number = ?
        """, (condition.value, patient_id, tooth_number))
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return updated
