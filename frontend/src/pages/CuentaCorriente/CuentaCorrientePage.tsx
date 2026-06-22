import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Wallet, Search, User } from "lucide-react";
import { getAccountSummary } from "../../api/patientApi";

interface AccountSummaryRow {
  patient_id: number;
  patient_name: string;
  last_name?: string;
  dni?: string;
  total_debe: number;
  total_haber: number;
  balance: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
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

  const totalDebe = summary.reduce((a, r) => a + r.total_debe, 0);
  const totalHaber = summary.reduce((a, r) => a + r.total_haber, 0);
  const totalBalance = totalDebe - totalHaber;

  if (isLoading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Cargando cuentas corrientes...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cuenta Corriente</h2>
          <p className="text-muted-foreground">Resumen financiero de todos los pacientes</p>
        </div>
      </div>

      {/* Totales globales */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total facturado</p>
          <p className="text-2xl font-bold text-foreground">{fmt(totalDebe)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total cobrado</p>
          <p className="text-2xl font-bold text-green-600">{fmt(totalHaber)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo pendiente</p>
          <p className={`text-2xl font-bold ${totalBalance > 0 ? "text-rose-600" : "text-green-600"}`}>{fmt(totalBalance)}</p>
        </div>
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

      {/* Tabla */}
      <div className="rounded-2xl border border-border/60 overflow-hidden shadow-sm bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold">Paciente</th>
              <th className="px-4 py-3 font-semibold text-right">Facturado</th>
              <th className="px-4 py-3 font-semibold text-right">Cobrado</th>
              <th className="px-4 py-3 font-semibold text-right">Saldo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay pacientes.</td></tr>
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
                <td className="px-4 py-3 text-right font-medium">{fmt(row.total_debe)}</td>
                <td className="px-4 py-3 text-right font-medium text-green-600">{fmt(row.total_haber)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center gap-1 font-bold ${row.balance > 0 ? "text-rose-600" : row.balance < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    {row.balance > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : row.balance < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                    {fmt(Math.abs(row.balance))}
                    {row.balance < 0 && <span className="text-xs font-normal">(a favor)</span>}
                  </span>
                </td>
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
