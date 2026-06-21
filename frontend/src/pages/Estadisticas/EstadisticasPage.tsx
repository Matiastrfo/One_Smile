import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, Users, CheckCircle, XCircle, Clock, Ban } from "lucide-react";
import api from "../../api/axios";

interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_month: { month: string; ATTENDED: number; ABSENT: number; CANCELLED: number; PENDING: number; total: number }[];
  by_dow: { day: string; total: number }[];
  top_patients: { patient_id: number; name: string; total: number; attended: number; absent: number; cancelled: number }[];
}

const STATUS_CONFIG = {
  ATTENDED:  { label: "Asistidos",   color: "bg-green-500",  text: "text-green-600",  icon: CheckCircle },
  ABSENT:    { label: "Ausentes",    color: "bg-rose-500",   text: "text-rose-600",   icon: XCircle },
  CANCELLED: { label: "Cancelados",  color: "bg-amber-500",  text: "text-amber-600",  icon: Ban },
  PENDING:   { label: "Pendientes",  color: "bg-blue-500",   text: "text-blue-600",   icon: Clock },
};

const MONTH_LABELS = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

const BAR_COLORS = ["#22c55e", "#f43f5e", "#f59e0b", "#60a5fa"];

function BarGroup({ label, attended, absent, cancelled, pending, max }: {
  label: string; attended: number; absent: number; cancelled: number; pending: number; max: number;
}) {
  const total = attended + absent + cancelled + pending;
  return (
    <div className="flex flex-col items-center gap-1 min-w-[32px]">
      <span className="text-[10px] font-bold text-foreground">{total > 0 ? total : ""}</span>
      <div className="flex items-end gap-0.5 h-24 w-full">
        {[attended, absent, cancelled, pending].map((v, i) => (
          <div key={i} className="flex-1 rounded-t-sm transition-all"
            style={{ height: max > 0 ? `${(v / max) * 96}px` : "0", backgroundColor: BAR_COLORS[i] }} />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

export function EstadisticasPage() {
  const [period, setPeriod] = useState<"all" | "month" | "year">("year");

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["appointmentStats"],
    queryFn: async () => { const { data } = await api.get("/appointments/stats"); return data; },
  });

  if (isLoading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Cargando estadísticas...</div>;
  if (!stats) return null;

  const total = stats.total;
  const attended  = stats.by_status.ATTENDED  ?? 0;
  const absent    = stats.by_status.ABSENT    ?? 0;
  const cancelled = stats.by_status.CANCELLED ?? 0;
  const pending   = stats.by_status.PENDING   ?? 0;
  const attended_pct = pct(attended, total - pending);

  const maxMonth = Math.max(...stats.by_month.map(m => m.total), 1);
  const maxDow   = Math.max(...stats.by_dow.map(d => d.total), 1);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
          <BarChart2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estadísticas de Turnos</h2>
          <p className="text-muted-foreground">Análisis de asistencia y cancelaciones</p>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: "ATTENDED",  val: attended,  extra: `${pct(attended,total)}% del total` },
          { key: "ABSENT",    val: absent,    extra: `${pct(absent,total)}% del total` },
          { key: "CANCELLED", val: cancelled, extra: `${pct(cancelled,total)}% del total` },
          { key: "PENDING",   val: pending,   extra: "Sin confirmar" },
        ].map(({ key, val, extra }) => {
          const cfg = STATUS_CONFIG[key as keyof typeof STATUS_CONFIG];
          const Icon = cfg.icon;
          return (
            <div key={key} className="bg-card border border-border/60 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cfg.label}</p>
                <Icon className={`h-4 w-4 ${cfg.text}`} />
              </div>
              <p className="text-3xl font-bold">{val}</p>
              <p className="text-xs text-muted-foreground">{extra}</p>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${cfg.color}`} style={{ width: `${pct(val, total)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tasa de asistencia */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 flex items-center gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tasa de asistencia</p>
          <p className="text-4xl font-black text-green-600">{attended_pct}%</p>
          <p className="text-xs text-muted-foreground mt-1">De los turnos que ya pasaron</p>
        </div>
        <div className="flex-1">
          <div className="h-4 rounded-full bg-muted overflow-hidden flex">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${pct(attended, total - pending)}%` }} title="Asistidos" />
            <div className="h-full bg-rose-500  transition-all" style={{ width: `${pct(absent,   total - pending)}%` }} title="Ausentes" />
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct(cancelled,total - pending)}%` }} title="Cancelados" />
          </div>
          <div className="flex gap-4 mt-2">
            {[["bg-green-500","Asistidos"],["bg-rose-500","Ausentes"],["bg-amber-500","Cancelados"]].map(([c,l]) => (
              <span key={l} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${c}`} />{l}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico por mes */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold">Turnos por mes</h3>
          {stats.by_month.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
          ) : (
            <div className="flex items-end gap-2 overflow-x-auto pb-1">
              {stats.by_month.map(m => {
                const [year, month] = m.month.split("-");
                return (
                  <BarGroup key={m.month}
                    label={`${MONTH_LABELS[parseInt(month)]}\n${year.slice(2)}`}
                    attended={m.ATTENDED} absent={m.ABSENT}
                    cancelled={m.CANCELLED} pending={m.PENDING}
                    max={maxMonth}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Gráfico por día de semana */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold">Turnos por día de semana</h3>
          <div className="flex items-end gap-2">
            {stats.by_dow.filter(d => d.day !== "Dom" && d.day !== "Sáb").map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-muted-foreground">{d.total}</span>
                <div className="w-full rounded-t-lg transition-all"
                  style={{ height: `${(d.total / maxDow) * 96}px`, minHeight: d.total > 0 ? "4px" : "0", backgroundColor: "#6366f1" }} />
                <span className="text-xs text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top pacientes */}
      {stats.top_patients.length > 0 && (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Pacientes con más turnos</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-xs">Paciente</th>
                <th className="px-4 py-2.5 text-center font-semibold text-xs">Total</th>
                <th className="px-4 py-2.5 text-center font-semibold text-xs text-green-600">Asistió</th>
                <th className="px-4 py-2.5 text-center font-semibold text-xs text-rose-600">Ausente</th>
                <th className="px-4 py-2.5 text-center font-semibold text-xs text-amber-600">Canceló</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs">Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {stats.top_patients.map(p => {
                const done = p.attended + p.absent + p.cancelled;
                const rate = pct(p.attended, done);
                return (
                  <tr key={p.patient_id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5 text-center font-bold">{p.total}</td>
                    <td className="px-4 py-2.5 text-center text-green-600 font-semibold">{p.attended}</td>
                    <td className="px-4 py-2.5 text-center text-rose-600 font-semibold">{p.absent}</td>
                    <td className="px-4 py-2.5 text-center text-amber-600 font-semibold">{p.cancelled}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-right">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
