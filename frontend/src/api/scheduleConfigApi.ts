import api from "./axios";

export interface DaySchedule {
  day_of_week: string;
  enabled: boolean;
  start_time: string;
  end_time: string;
  slot_duration: number;
}

export interface ScheduleConfig {
  professional_id?: number;
  days: DaySchedule[];
}

export const getScheduleConfig = async (): Promise<ScheduleConfig> => {
  const { data } = await api.get("/api/schedule-config/");
  return data;
};

export const saveScheduleConfig = async (config: ScheduleConfig): Promise<ScheduleConfig> => {
  const { data } = await api.put("/api/schedule-config/", config);
  return data;
};
