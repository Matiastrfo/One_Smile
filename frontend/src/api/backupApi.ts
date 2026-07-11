import api from "./axios";

export interface BackupConfig {
  destination_path: string;
  is_default_path: boolean;
  enabled: boolean;
  keep_count: number;
  last_backup_at: string | null;
}

export interface BackupFile {
  filename: string;
  size_bytes: number;
  created_at: string;
}

export const getBackupConfig = async (): Promise<BackupConfig> => {
  const { data } = await api.get("/api/backup/config");
  return data;
};

export const saveBackupConfig = async (config: { destination_path: string; enabled: boolean; keep_count: number }): Promise<void> => {
  await api.put("/api/backup/config", config);
};

export const runBackupNow = async (): Promise<{ message: string; path: string }> => {
  const { data } = await api.post("/api/backup/run");
  return data;
};

export const listBackups = async (): Promise<BackupFile[]> => {
  const { data } = await api.get("/api/backup/list");
  return data;
};
