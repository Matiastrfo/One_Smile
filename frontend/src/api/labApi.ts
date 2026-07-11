import api from "./axios";

export interface Lab {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  price_list_path?: string;
  created_at: string;
}

export interface LabJob {
  id: number;
  lab_id: number;
  patient_id: number;
  professional_id?: number;
  description: string;
  sent_date: string;
  status: "SENT" | "RECEIVED";
  received_date?: string;
  notes?: string;
  lab_name?: string;
  patient_name?: string;
  professional_name?: string;
}

export const getLabs = async (): Promise<Lab[]> => {
  const { data } = await api.get("/api/labs");
  return data;
};

export const createLab = async (body: { name: string; phone?: string; email?: string }): Promise<Lab> => {
  const { data } = await api.post("/api/labs", body);
  return data;
};

export const updateLab = async (id: number, body: { name: string; phone?: string; email?: string }): Promise<Lab> => {
  const { data } = await api.put(`/api/labs/${id}`, body);
  return data;
};

export const deleteLab = async (id: number): Promise<void> => {
  await api.delete(`/api/labs/${id}`);
};

export const uploadPriceList = async (labId: number, file: File): Promise<Lab> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/api/labs/${labId}/price-list`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const getLabJobs = async (): Promise<LabJob[]> => {
  const { data } = await api.get("/api/labs/jobs");
  return data;
};

export const createLabJob = async (body: { lab_id: number; patient_id: number; description: string; sent_date?: string; notes?: string }): Promise<LabJob> => {
  const { data } = await api.post("/api/labs/jobs", body);
  return data;
};

export const markJobReceived = async (jobId: number): Promise<LabJob> => {
  const { data } = await api.patch(`/api/labs/jobs/${jobId}/receive`);
  return data;
};

export const deleteLabJob = async (jobId: number): Promise<void> => {
  await api.delete(`/api/labs/jobs/${jobId}`);
};
