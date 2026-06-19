import api from "./axios";
import type { Patient } from "../types";

export const getPatients = async (search?: string): Promise<Patient[]> => {
  const url = search ? `/patients/?search=${encodeURIComponent(search)}` : "/patients/";
  const { data } = await api.get(url);
  return data;
};

export const createPatient = async (patient: Patient): Promise<Patient> => {
  const { data } = await api.post("/patients/", patient);
  return data;
};

export const updatePatient = async (id: number, patient: Patient): Promise<Patient> => {
  const { data } = await api.put(`/patients/${id}`, patient);
  return data;
};

export const deletePatient = async (id: number): Promise<void> => {
  await api.delete(`/patients/${id}`);
};

export const getPatientReport = async (id: number): Promise<any> => {
  const { data } = await api.get(`/patients/${id}/report`);
  return data;
};

export const addTreatment = async (patientId: number, treatment: any): Promise<any> => {
  const { data } = await api.post(`/patients/${patientId}/treatments`, { ...treatment, patient_id: patientId });
  return data;
};

export const updateTreatment = async (patientId: number, treatmentId: number, treatment: any): Promise<any> => {
  const { data } = await api.put(`/patients/${patientId}/treatments/${treatmentId}`, { ...treatment, patient_id: patientId });
  return data;
};

export const deleteTreatment = async (patientId: number, treatmentId: number): Promise<void> => {
  await api.delete(`/patients/${patientId}/treatments/${treatmentId}`);
};

export const addMedicalReport = async (patientId: number, report: any): Promise<any> => {
  const { data } = await api.post(`/patients/${patientId}/medical-reports`, { ...report, patient_id: patientId });
  return data;
};

export const getOdontogram = async (patientId: number): Promise<any> => {
  const { data } = await api.get(`/patients/${patientId}/odontogram`);
  return data;
};

export const updateTooth = async (patientId: number, toothNumber: number, update: { treatment_type: string; color: string | null; faces: string[] }): Promise<void> => {
  await api.put(`/patients/${patientId}/odontogram/pieces/${toothNumber}`, update);
};

export const getPatientAccount = async (patientId: number) => {
  const { data } = await api.get(`/patients/${patientId}/account`);
  return data;
};

export const getAccountSummary = async () => {
  const { data } = await api.get("/patients/account-summary");
  return data;
};

export const addPatientPayment = async (patientId: number, payment: { date: string; amount: number; description: string }) => {
  const { data } = await api.post(`/patients/${patientId}/payments`, { ...payment, patient_id: patientId });
  return data;
};

export const deletePatientPayment = async (patientId: number, paymentId: number) => {
  await api.delete(`/patients/${patientId}/payments/${paymentId}`);
};

export const uploadPatientPhoto = async (patientId: number, file: File): Promise<Patient> => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/patients/${patientId}/photo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};
