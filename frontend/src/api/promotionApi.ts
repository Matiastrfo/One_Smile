import api from "./axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface Promotion {
  id: number;
  title: string;
  category: string;
  message: string | null;
  file_path: string;
  created_at: string;
}

export interface Recipient {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface SendJob {
  total: number;
  sent: number;
  failed: number;
  done: boolean;
  error: string | null;
  errors: string[];
}

export const promotionImageUrl = (p: Promotion) => `${API_BASE}${p.file_path}`;

export const getPromotions = async (): Promise<Promotion[]> => {
  const { data } = await api.get("/api/promotions");
  return data;
};

export const createPromotion = async (file: File, title: string, category: string, message: string): Promise<Promotion> => {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  form.append("category", category);
  form.append("message", message);
  const { data } = await api.post("/api/promotions", form, { headers: { "Content-Type": "multipart/form-data" } });
  return data;
};

export const updatePromotion = async (id: number, body: { title: string; category: string; message: string }): Promise<Promotion> => {
  const { data } = await api.put(`/api/promotions/${id}`, body);
  return data;
};

export const deletePromotion = async (id: number): Promise<void> => {
  await api.delete(`/api/promotions/${id}`);
};

export const getRecipients = async (): Promise<Recipient[]> => {
  const { data } = await api.get("/api/promotions/recipients");
  return data;
};

// patientIds = null → todos los pacientes con mail cargado
export const startEmailSend = async (id: number, patientIds: number[] | null): Promise<{ job_id: string; total: number; skipped_no_email: number }> => {
  const { data } = await api.post(`/api/promotions/${id}/send-email`, { patient_ids: patientIds });
  return data;
};

export const getSendJob = async (jobId: string): Promise<SendJob> => {
  const { data } = await api.get(`/api/promotions/jobs/${jobId}`);
  return data;
};
