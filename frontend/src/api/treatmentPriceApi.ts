import api from "./axios";

export interface TreatmentPrice {
  treatment_type: string;
  price: number;
}

export const getTreatmentPrices = async (): Promise<TreatmentPrice[]> => {
  const { data } = await api.get("/api/treatment-prices");
  return data;
};

export const saveTreatmentPrices = async (prices: TreatmentPrice[]): Promise<void> => {
  await api.put("/api/treatment-prices", prices);
};
