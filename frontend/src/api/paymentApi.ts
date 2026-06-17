import api from "./axios";
import type { BoxPayment } from "../types";

export const getPayments = async (): Promise<BoxPayment[]> => {
  const { data } = await api.get("/api/admin/payments");
  return data;
};

export const generateMonthlyPayments = async (monthYear?: string): Promise<{generated_count: number, month_year: string}> => {
  const url = monthYear ? `/api/admin/payments/generate?month_year=${monthYear}` : "/api/admin/payments/generate";
  const { data } = await api.post(url);
  return data;
};

export const updatePayment = async (id: number, payment: Partial<BoxPayment>): Promise<BoxPayment> => {
  const { data } = await api.put(`/api/admin/payments/${id}`, payment);
  return data;
};

export const deletePayment = async (id: number): Promise<void> => {
  await api.delete(`/api/admin/payments/${id}`);
};
