import unittest
from domain.appointment import Appointment

class TestAppointment(unittest.TestCase):
    
    def test_default_status_is_pending(self):
        appointment = Appointment(patient_id=1, date_time="2026-10-10 10:00", reason="Checkup")
        self.assertEqual(appointment.status, "PENDING")

    def test_change_status_to_valid_value(self):
        appointment = Appointment(patient_id=1, date_time="2026-10-10 10:00", reason="Checkup")
        appointment.change_status("ATTENDED")
        self.assertEqual(appointment.status, "ATTENDED")
        
        appointment.change_status("ABSENT")
        self.assertEqual(appointment.status, "ABSENT")

    def test_change_status_to_invalid_value_raises_error(self):
        appointment = Appointment(patient_id=1, date_time="2026-10-10 10:00", reason="Checkup")
        with self.assertRaises(ValueError):
            appointment.change_status("INVALID_STATUS")

if __name__ == "__main__":
    unittest.main()
