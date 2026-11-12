import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Wallet, Search, User } from "lucide-react";
import { getAccountSummary } from "../../api/patientApi";
import { formatMoney, CURRENCY_LABEL } from "../../utils/money";
import type { AccountSummaryRow, Currency, CurrencyTotals } from "../../types";

const CURRENCIES: { currency: Currency; key: "ars" | "usd" }[] = [
  { currency: "ARS", key: "ars" },
  { currency: "USD", key: "usd" },
];

function BalanceCell({ totals, currency }: { totals: CurrencyTotals; currency: Currency }) {
  if (totals.debe === 0 && totals.haber === 0) return <span className="text-muted-foreground">—</span>;
  const { balance } = totals;
  return (
    <span className={`inline-flex items-center gap-1 font-bold ${balance > 0 ? "text-rose-600" : balance < 0 ? "text-green-600" : "text-muted-foreground"}`}>
      {balance > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : balance < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
      {formatMoney(Math.abs(balance), currency)}
      {balance < 0 && <span className="text-xs font-normal">(a favor)</span>}
    </span>
  );
}

export function CuentaCorrientePage() {
  const [search, setSearch] = useState("");

  const { data: summary = [], isLoading } = useQuery<AccountSummaryRow[]>({
    queryKey: ["accountSummary"],
    queryFn: getAccountSummary,
  });

  const filtered = summary.filter(row => {
    const full = `${row.patient_name} ${row.last_name ?? ""} ${row.dni ?? ""}`.toLowerCase();
    return full.includes(search.toLowerCase());
  });

  // Totales por moneda: cada una se suma solo con sí misma.
  const totalsFor = (key: "ars" | "usd") => {
    const debe = summary.reduce((a, r) => a + r[key].debe, 0);
    const haber = summary.reduce((a, r) => a + r[key].haber, 0);
    return { debe, haber, balance: debe - haber };
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Cargando cuentas corrientes...</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cuenta Corriente</h2>
          <p className="text-muted-foreground">Resumen financiero de todos los pacientes, en pesos y en dólares</p>
        </div>
      </div>

      {/* Totales globales: un bloque por moneda */}
      <div className="space-y-4">
        {CURRENCIES.map(({ currency, key }) => {
          const t = totalsFor(key);
          return (
            <div key={currency} className="space-y-2">
              <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {CURRENCY_LABEL[currency]}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total facturado</p>
                  <p className="text-2xl font-bold text-foreground">{formatMoney(t.debe, currency)}</p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total cobrado</p>
                  <p className="text-2xl font-bold text-green-600">{formatMoney(t.haber, currency)}</p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo pendiente</p>
                  <p className={`text-2xl font-bold ${t.balance > 0 ? "text-rose-600" : "text-green-600"}`}>{formatMoney(t.balance, currency)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre o DNI..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-input bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Tabla: un saldo por moneda en la misma fila */}
      <div className="rounded-2xl border border-border/60 overflow-hidden shadow-sm bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold">Paciente</th>
              <th className="px-4 py-3 font-semibold text-right">Saldo en pesos</th>
              <th className="px-4 py-3 font-semibold text-right">Saldo en dólares</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No hay pacientes.</td></tr>
            ) : filtered.map(row => (
              <tr key={row.patient_id} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-primary shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{row.patient_name}{row.last_name ? ` ${row.last_name}` : ""}</p>
                      {row.dni && <p className="text-xs text-muted-foreground">DNI: {row.dni}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right"><BalanceCell totals={row.ars} currency="ARS" /></td>
                <td className="px-4 py-3 text-right"><BalanceCell totals={row.usd} currency="USD" /></td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/patients/${row.patient_id}`}
                    state={{ openTab: "cuenta-corriente" }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Ver cuenta →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
