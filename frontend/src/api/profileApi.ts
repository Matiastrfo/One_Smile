import api from "./axios";

export interface UserProfile {
  id: number;
  email: string;
  role: string;
  name: string;
  avatar_path?: string | null;
}

export const getMyProfile = async (): Promise<UserProfile> => {
  const { data } = await api.get("/api/profile/me");
  return data;
};

export const updateMyName = async (name: string): Promise<UserProfile> => {
  const { data } = await api.put("/api/auth/me", { name });
  return data;
};

export const uploadAvatar = async (file: File): Promise<UserProfile> => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/api/profile/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};
