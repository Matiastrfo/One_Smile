import { Plus, Clock, CheckCircle2, XCircle, Trash2, FileText, Download } from "lucide-react";
import { Link } from "react-router-dom";
import type { Appointment } from "../../../types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { downloadAppointmentPdf } from "../../../utils/appointmentPdf";
import { useAuth } from "../../../context/AuthContext";
import logoUrl from "../../../assets/logo.png";

interface DayPanelProps {
  date: Date;
  appointments: Appointment[];
  getPatientName: (id: number) => string;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const STATUS_CONFIG = {
  PENDING:  { label: "Pendiente",  icon: Clock,        cls: "bg-slate-500 text-white border-slate-500" },
  ATTENDED: { label: "Atendido",   icon: CheckCircle2, cls: "bg-emerald-500 text-white border-emerald-500" },
  ABSENT:   { label: "Ausente",    icon: XCircle,      cls: "bg-rose-500 text-white border-rose-500" },
};

const STATUSES = ["PENDING", "ATTENDED", "ABSENT"] as const;

export function DayPanel({ date, appointments, getPatientName, onAdd, onDelete, onStatusChange }: DayPanelProps) {
  const { user } = useAuth();
  const sorted = [...appointments].sort((a, b) => a.date_time.localeCompare(b.date_time));

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{WEEKDAYS[date.getDay()]}</p>
          <h3 className="text-lg font-bold text-foreground leading-tight">
            {date.getDate()} de {MONTHS[date.getMonth()]} {date.getFullYear()}
          </h3>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-3 py-2 rounded-xl text-sm transition-all shadow-md shadow-primary/30"
        >
          <Plus className="h-4 w-4" />
          Agendar
        </button>
      </div>

      {/* Appointments */}
      <div className="flex-1 divide-y divide-border/40 overflow-y-auto max-h-[500px]">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">Sin turnos este día</p>
            <button onClick={onAdd} className="text-primary text-xs hover:underline mt-2 font-medium">
              + Agendar el primero
            </button>
          </div>
        ) : (
          sorted.map(appt => {
            const time = appt.date_time.split(" ")[1] ?? "";
            const status = (appt.status ?? "PENDING") as keyof typeof STATUS_CONFIG;
            const { label, icon: Icon, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

            return (
              <div key={appt.id} className="flex items-start gap-3 px-5 py-4 hover:bg-muted/20 transition-colors">
                {/* Time */}
                <div className="text-center shrink-0 w-12">
                  <span className="text-sm font-bold text-foreground">{time}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm leading-tight truncate">
                    {getPatientName(appt.patient_id)}
                  </p>
                  {appt.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{appt.reason}</p>
                  )}
                  {/* Status selector */}
                  <Select value={status} onValueChange={val => onStatusChange(appt.id!, val)}>
                    <SelectTrigger
                      className={`mt-2 w-fit gap-1.5 cursor-pointer text-xs font-semibold tracking-wide uppercase border rounded-full px-3 py-1 h-auto shadow-sm focus:ring-offset-1 ${cls}`}
                    >
                      <Icon className="h-3 w-3" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="ATTENDED">Atendido</SelectItem>
                      <SelectItem value="ABSENT">Ausente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => downloadAppointmentPdf(appt, getPatientName(appt.patient_id), user?.name || user?.email || '', logoUrl)}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="Descargar PDF del turno"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    to={`/patients/${appt.patient_id}`}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="Ver historial"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => onDelete(appt.id!)}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                    title="Eliminar turno"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
