import { useState, useEffect } from "react";
import { X, CalendarPlus, UserPlus, Users, Search } from "lucide-react";
import type { Patient } from "../../../types";

interface QuickAppointmentModalProps {
  date: Date;
  patients: Patient[];
  preselectedPatientId?: number | null;
  onClose: () => void;
  onSubmitNew: (data: { patient_name: string; patient_phone?: string; patient_email?: string; date_time: string; reason?: string }) => void;
  onSubmitExisting: (data: { patient_id: number; date_time: string; reason: string }) => void;
  isPending: boolean;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

export function QuickAppointmentModal({ date, patients, preselectedPatientId, onClose, onSubmitNew, onSubmitExisting, isPending }: QuickAppointmentModalProps) {

  const defaultDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const preselected = preselectedPatientId ? (patients.find(p => p.id === preselectedPatientId) ?? null) : null;
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preselected);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [apptDate, setApptDate] = useState(defaultDate);
  const [apptTime, setApptTime] = useState("09:00");
  const [reason, setReason] = useState("");

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.dni && p.dni.includes(search))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const date_time = `${apptDate} ${apptTime}`;
    if (mode === "existing") {
      if (!selectedPatient) return;
      onSubmitExisting({ patient_id: selectedPatient.id!, date_time, reason });
    } else {
      if (!patientName.trim()) return;
      onSubmitNew({ patient_name: patientName.trim(), patient_phone: patientPhone.trim() || undefined, patient_email: patientEmail.trim() || undefined, date_time, reason });
    }
  };

  const canSubmit = mode === "existing" ? !!selectedPatient : !!patientName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-lg border border-border/60 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent text-primary">
              <CalendarPlus className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-foreground">Nuevo Turno</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">

          {/* Selector de modo */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl">
            <button
              type="button"
              onClick={() => { setMode("existing"); setSelectedPatient(null); setSearch(""); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all
                ${mode === "existing" ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Users className="h-3.5 w-3.5" /> Paciente existente
            </button>
            <button
              type="button"
              onClick={() => { setMode("new"); setSelectedPatient(null); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all
                ${mode === "new" ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <UserPlus className="h-3.5 w-3.5" /> Paciente nuevo
            </button>
          </div>

          {/* Paciente existente */}
          {mode === "existing" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Buscar paciente</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelectedPatient(null); }}
                  placeholder="Nombre o DNI..."
                  className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {selectedPatient ? (
                <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border border-primary/30 rounded-xl text-sm">
                  <span className="font-semibold text-primary">{selectedPatient.name}</span>
                  <button type="button" onClick={() => { setSelectedPatient(null); setSearch(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : search.length > 0 && (
                <div className="border border-border/60 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground text-center">Sin resultados</p>
                  ) : (
                    filtered.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedPatient(p); setSearch(""); }}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors flex justify-between items-center border-b border-border/40 last:border-0"
                      >
                        <span className="font-medium">{p.name}</span>
                        {p.dni && <span className="text-xs text-muted-foreground">DNI: {p.dni}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Paciente nuevo */}
          {mode === "new" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Nombre del paciente</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="Ej: Juan García"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Teléfono <span className="font-normal">(opcional)</span></label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={e => setPatientPhone(e.target.value)}
                  placeholder="Ej: +5491112345678"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Email <span className="font-normal">(opcional — para recordatorios)</span></label>
                <input
                  type="email"
                  value={patientEmail}
                  onChange={e => setPatientEmail(e.target.value)}
                  placeholder="Ej: paciente@email.com"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground">Se creará como paciente nuevo. Podés agregar el DNI después desde Gestión de Pacientes.</p>
            </div>
          )}

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Fecha</label>
              <input
                type="date"
                required
                value={apptDate}
                onChange={e => setApptDate(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Hora</label>
              <input
                type="time"
                required
                value={apptTime}
                onChange={e => setApptTime(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Motivo (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: Consulta, limpieza, extracción..."
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium border border-input hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 py-2 rounded-xl transition-all disabled:opacity-50 text-sm shadow-md shadow-primary/30"
            >
              {isPending ? "Agendando..." : "Agendar Turno"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
