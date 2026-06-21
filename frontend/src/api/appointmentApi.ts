import api from "./axios";
import type { Appointment } from "../types";

export const getAppointments = async (): Promise<Appointment[]> => {
  const { data } = await api.get("/appointments/");
  return data;
};

export const createAppointment = async (appointment: Appointment): Promise<Appointment> => {
  const { data } = await api.post("/appointments/", appointment);
  return data;
};

export const deleteAppointment = async (id: number): Promise<void> => {
  await api.delete(`/appointments/${id}`);
};

export const updateAppointmentStatus = async (id: number, status: string, notes?: string): Promise<void> => {
  await api.patch(`/appointments/${id}/status`, { status, notes });
};

export const quickCreateAppointment = async (body: {
  patient_name: string;
  patient_phone?: string;
  date_time: string;
  reason?: string;
}): Promise<Appointment> => {
  const { data } = await api.post("/appointments/quick", body);
  return data;
};
