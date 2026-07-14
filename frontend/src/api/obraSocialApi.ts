import api from "./axios";

export interface ObraSocial {
  id: number;
  name: string;
  is_custom: boolean;
  arancel_path?: string | null;
  norma_path?: string | null;
}

export const getObrasSociales = async (): Promise<ObraSocial[]> => {
  const { data } = await api.get("/api/obras-sociales");
  return data;
};

export const createObraSocial = async (name: string): Promise<ObraSocial> => {
  const { data } = await api.post("/api/obras-sociales", { name });
  return data;
};

export const deleteObraSocial = async (id: number): Promise<void> => {
  await api.delete(`/api/obras-sociales/${id}`);
};

export const uploadObraSocialArancel = async (id: number, file: File): Promise<ObraSocial> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/api/obras-sociales/${id}/arancel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const uploadObraSocialNorma = async (id: number, file: File): Promise<ObraSocial> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/api/obras-sociales/${id}/norma`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteObraSocialArancel = async (id: number): Promise<ObraSocial> => {
  const { data } = await api.delete(`/api/obras-sociales/${id}/arancel`);
  return data;
};

export const deleteObraSocialNorma = async (id: number): Promise<ObraSocial> => {
  const { data } = await api.delete(`/api/obras-sociales/${id}/norma`);
  return data;
};
