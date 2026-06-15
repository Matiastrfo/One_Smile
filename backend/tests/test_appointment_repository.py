import unittest
from unittest.mock import patch, MagicMock
from persistence.appointment_repository import AppointmentRepository
from domain.appointment import Appointment

class TestAppointmentRepository(unittest.TestCase):

    def setUp(self):
        self.repository = AppointmentRepository()

    @patch('persistence.appointment_repository.get_connection')
    def test_update_status_success(self, mock_get_connection):
        # Arrange
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.rowcount = 1

        # Act
        result = self.repository.update_status(appointment_id=1, new_status="ATTENDED")

        # Assert
        mock_cursor.execute.assert_called_once_with(
            "UPDATE appointments SET status = ? WHERE id = ?",
            ("ATTENDED", 1)
        )
        mock_conn.commit.assert_called_once()
        self.assertTrue(result)

    @patch('persistence.appointment_repository.get_connection')
    def test_update_status_non_existent_appointment(self, mock_get_connection):
        # Arrange
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.rowcount = 0  # No rows updated

        # Act
        result = self.repository.update_status(appointment_id=999, new_status="ATTENDED")

        # Assert
        mock_cursor.execute.assert_called_once_with(
            "UPDATE appointments SET status = ? WHERE id = ?",
            ("ATTENDED", 999)
        )
        # Should return False if no rows were updated
        self.assertFalse(result)

if __name__ == "__main__":
    unittest.main()
