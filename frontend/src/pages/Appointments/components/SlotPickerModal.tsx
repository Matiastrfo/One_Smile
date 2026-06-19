import { useState, useEffect } from "react";
import { X, CalendarPlus, Clock, Users, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import type { Patient, Appointment } from "../../../types";
import type { DaySchedule, ScheduleConfig } from "../../../api/scheduleConfigApi";

const DAY_MAP: Record<number, string> = {
  0: "SUNDAY", 1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY",
  4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
};
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_LABELS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

interface Props {
  date: Date;
  daySchedule: DaySchedule;
  patients: Patient[];
  appointments: Appointment[];
  allAppointments?: Appointment[];
  scheduleConfig?: ScheduleConfig | null;
  preselectedPatientId?: number | null;
  onClose: () => void;
  onDateChange?: (date: Date) => void;
  onSubmit: (data: { patient_id: number; date_time: string; reason: string }) => void;
  onSubmitNew: (data: { patient_name: string; patient_phone?: string; date_time: string; reason?: string }) => void;
  isPending: boolean;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function generateSlots(schedule: DaySchedule): string[] {
  const slots: string[] = [];
  const [startH, startM] = schedule.start_time.split(":").map(Number);
  const [endH, endM] = schedule.end_time.split(":").map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;
  while (current < end) {
    slots.push(`${pad(Math.floor(current / 60))}:${pad(current % 60)}`);
    current += schedule.slot_duration;
  }
  return slots;
}

export function SlotPickerModal({ date, daySchedule, patients, appointments, allAppointments, scheduleConfig, preselectedPatientId, onClose, onDateChange, onSubmit, onSubmitNew, isPending }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    return () => { (document.activeElement as HTMLElement)?.blur(); document.body.focus(); };
  }, []);

  // Generar 7 días a partir del lunes de la semana actual + offset
  const today = new Date(); today.setHours(0,0,0,0);
  const startOfWeek = new Date(today);
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1; // lunes=0
  startOfWeek.setDate(today.getDate() - dow + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d;
  });

  const getDaySchedule = (d: Date): DaySchedule | null => {
    if (!scheduleConfig) return null;
    return scheduleConfig.days.find(s => s.day_of_week === DAY_MAP[d.getDay()] && s.enabled) ?? null;
  };

  const getBookedSlots = (d: Date, schedule: DaySchedule): Set<string> => {
    const src = allAppointments ?? appointments;
    const ds = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const dayAppts = src.filter(a => a.date_time.startsWith(ds));
    const slots = new Set(generateSlots(schedule));
    return new Set(dayAppts.map(a => a.date_time.split(" ")[1]?.slice(0,5)).filter(t => t && slots.has(t)));
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const handleDaySelect = (d: Date) => {
    const sched = getDaySchedule(d);
    if (!sched) return;
    onDateChange?.(d);
    setSelectedSlot(null);
  };

  // Datos del día actualmente seleccionado (prop date)
  const currentSchedule = getDaySchedule(date) ?? daySchedule;
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const slots = generateSlots(currentSchedule);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [patientId, setPatientId] = useState<string>(preselectedPatientId ? String(preselectedPatientId) : "");
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [reason, setReason] = useState("");

  const bookedTimes = new Set(
    appointments.map(a => a.date_time.split(" ")[1]?.slice(0, 5)).filter(Boolean)
  );

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.dni && p.dni.includes(search))
  );

  const selectedPatient = patients.find(p => String(p.id) === patientId) ?? null;

  const canSubmit = !!selectedSlot && (mode === "existing" ? !!patientId : !!newName.trim());

  const handleSubmit = () => {
    if (!selectedSlot) return;
    const date_time = `${dateStr} ${selectedSlot}`;
    if (mode === "existing" && patientId) {
      onSubmit({ patient_id: parseInt(patientId), date_time, reason });
    } else if (mode === "new" && newName.trim()) {
      onSubmitNew({ patient_name: newName.trim(), patient_phone: newPhone.trim() || undefined, date_time, reason });
    }
  };

  const dateLabel = date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <header className="border-b shrink-0">
          <div className="flex justify-between items-center gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent text-primary shrink-0">
                <CalendarPlus className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-base capitalize">{dateLabel}</h3>
                <p className="text-xs text-muted-foreground">Seleccioná un día y horario</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Selector de días */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset(w => w - 1)}
                disabled={weekOffset <= 0}
                className="p-1 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-1 flex-1">
                {weekDays.map((d, i) => {
                  const sched = getDaySchedule(d);
                  const hasAvail = !!sched;
                  const booked = hasAvail ? getBookedSlots(d, sched!) : new Set<string>();
                  const total = hasAvail ? generateSlots(sched!).length : 0;
                  const free = total - booked.size;
                  const isPast = d < today;
                  const isSelected = isSameDay(d, date);
                  const isToday = isSameDay(d, today);
                  return (
                    <button
                      key={i}
                      onClick={() => handleDaySelect(d)}
                      disabled={!hasAvail || isPast}
                      className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-xs transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                          : hasAvail && !isPast
                          ? 'hover:bg-accent border border-border/60'
                          : 'opacity-30 cursor-not-allowed'
                      }`}
                    >
                      <span className="font-semibold">{DAY_LABELS[d.getDay()]}</span>
                      <span className={`font-bold text-sm ${isToday && !isSelected ? 'text-primary' : ''}`}>{d.getDate()}</span>
                      {hasAvail && !isPast && (
                        <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-primary-foreground/80' : free > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {free > 0 ? `${free} lib.` : 'lleno'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setWeekOffset(w => w + 1)}
                className="p-1 rounded-lg hover:bg-muted transition-colors shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Grilla de slots */}
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Horarios disponibles
            </p>
            <div className="grid grid-cols-4 gap-2">
              {slots.map(slot => {
                const booked = bookedTimes.has(slot);
                const selected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={booked}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 rounded-xl text-sm font-semibold border transition-all ${
                      booked
                        ? 'bg-muted/50 text-muted-foreground border-border/40 cursor-not-allowed line-through opacity-50'
                        : selected
                        ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30'
                        : 'bg-background border-border/60 hover:border-primary/50 hover:bg-accent/50'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle existente / nuevo */}
          <div className="flex rounded-xl border border-border/60 overflow-hidden">
            <button
              type="button"
              onClick={() => { setMode("existing"); setNewName(""); setNewPhone(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === "existing" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"}`}
            >
              <Users className="h-4 w-4" /> Paciente existente
            </button>
            <button
              type="button"
              onClick={() => { setMode("new"); setPatientId(""); setSearch(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === "new" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"}`}
            >
              <UserPlus className="h-4 w-4" /> Paciente nuevo
            </button>
          </div>

          {/* Paciente existente */}
          {mode === "existing" && (
            <div className="space-y-2">
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-primary/40 bg-accent/30">
                  <div>
                    <p className="font-medium text-sm">{selectedPatient.name}</p>
                    <p className="text-xs text-muted-foreground">DNI: {selectedPatient.dni}</p>
                  </div>
                  <button type="button" onClick={() => { setPatientId(""); setSearch(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o DNI..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {search && (
                    <div className="border border-border/60 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-3">Sin resultados</p>
                      ) : (
                        filtered.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setPatientId(String(p.id)); setSearch(""); }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b border-border/40 last:border-0"
                          >
                            <span className="font-medium">{p.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">DNI: {p.dni}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Paciente nuevo */}
          {mode === "new" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nombre completo</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teléfono <span className="font-normal text-muted-foreground">(opcional)</span></label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="Ej: 11 1234-5678"
                  className="w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Motivo <span className="font-normal text-muted-foreground">(opcional)</span></p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Detalles de la consulta..."
              rows={2}
              className="w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <footer className="p-5 border-t flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isPending ? "Agendando..." : "Agendar turno"}
          </button>
        </footer>
      </div>
    </div>
  );
}
