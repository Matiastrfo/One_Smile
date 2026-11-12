import type { Currency } from "../types";

export const CURRENCY_LABEL: Record<Currency, string> = { ARS: "Pesos", USD: "Dólares" };
export const CURRENCY_SYMBOL: Record<Currency, string> = { ARS: "$", USD: "US$" };

// es-AR muestra los dolares como "US$ 1.200,00", asi no se confunden con los pesos ("$ 50.000").
export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(amount);
}
