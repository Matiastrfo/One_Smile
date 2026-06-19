import { useState } from "react";
import { X, Settings, Clock } from "lucide-react";
import type { ScheduleConfig, DaySchedule } from "../../../api/scheduleConfigApi";

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo",
};

const SLOT_OPTIONS = [15, 20, 30, 45, 60, 90, 120];

interface Props {
  config: ScheduleConfig;
  onClose: () => void;
  onSave: (config: ScheduleConfig) => void;
  isPending: boolean;
}

export function ScheduleConfigModal({ config, onClose, onSave, isPending }: Props) {
  const [days, setDays] = useState<DaySchedule[]>(config.days);

  const update = (idx: number, patch: Partial<DaySchedule>) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="flex justify-between items-center gap-3 p-5 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-accent text-primary shrink-0">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Configurar horarios</h3>
              <p className="text-xs text-muted-foreground">Definí tu grilla de turnos por día de la semana</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {days.map((day, idx) => (
            <div key={day.day_of_week} className={`rounded-xl border transition-all ${day.enabled ? 'border-primary/40 bg-accent/30' : 'border-border/60 bg-muted/20 opacity-60'}`}>
              <div className="flex items-center gap-4 p-4">
                {/* Toggle */}
                <button
                  onClick={() => update(idx, { enabled: !day.enabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${day.enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow-sm transition-transform ${day.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>

                <span className="font-semibold w-24 text-sm">{DAY_LABELS[day.day_of_week]}</span>

                {day.enabled && (
                  <div className="flex flex-wrap items-center gap-3 ml-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Desde</span>
                      <input
                        type="time"
                        value={day.start_time}
                        onChange={e => update(idx, { start_time: e.target.value })}
                        className="border border-input bg-background rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Hasta</span>
                      <input
                        type="time"
                        value={day.end_time}
                        onChange={e => update(idx, { end_time: e.target.value })}
                        className="border border-input bg-background rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <select
                        value={day.slot_duration}
                        onChange={e => update(idx, { slot_duration: parseInt(e.target.value) })}
                        className="border border-input bg-background rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {SLOT_OPTIONS.map(m => (
                          <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60}h`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <footer className="p-5 border-t flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ ...config, days })}
            disabled={isPending}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg transition-all disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar horarios"}
          </button>
        </footer>
      </div>
    </div>
  );
}
