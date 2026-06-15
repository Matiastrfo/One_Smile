from domain.appointment import Appointment
from persistence.appointment_repository import AppointmentRepository
from typing import List

class AppointmentService:
    def __init__(self):
        self.repository = AppointmentRepository()

    def create_appointment(self, appointment: Appointment) -> Appointment:
        if self.repository.is_time_taken(appointment.date_time, appointment.professional_id):
            raise ValueError("El horario ya está ocupado")
        return self.repository.insert(appointment)

    def get_appointments_by_professional(self, professional_id: int) -> List[Appointment]:
        return self.repository.get_by_professional(professional_id)

    def delete_appointment(self, id: int) -> None:
        self.repository.delete(id)

    def update_appointment_status(self, id: int, status: str) -> bool:
        # We can validate the status using the domain model temporarily just for the validation logic
        from domain.appointment import Appointment
        # Dummy appointment to check if the status is valid
        dummy = Appointment(patient_id=1, date_time="", reason="")
        dummy.change_status(status) # Will raise ValueError if invalid
        
        updated = self.repository.update_status(id, status)
        if not updated:
            raise ValueError("Turno no encontrado")
        return updated
