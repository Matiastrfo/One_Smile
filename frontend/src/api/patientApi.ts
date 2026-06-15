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

export const addMedicalReport = async (patientId: number, report: any): Promise<any> => {
  const { data } = await api.post(`/patients/${patientId}/medical-reports`, { ...report, patient_id: patientId });
  return data;
};

export const getOdontogram = async (patientId: number): Promise<any> => {
  const { data } = await api.get(`/patients/${patientId}/odontogram`);
  return data;
};

export const recordToothTreatment = async (patientId: number, toothNumber: number, treatmentData: any): Promise<any> => {
  const { data } = await api.post(`/patients/${patientId}/odontogram/pieces/${toothNumber}/treatments`, treatmentData);
  return data;
};

export const getToothTreatments = async (patientId: number, toothNumber: number): Promise<any> => {
  const { data } = await api.get(`/patients/${patientId}/odontogram/pieces/${toothNumber}/treatments`);
  return data;
};
