import { Trash2, Clock, User, Calendar as CalendarIcon, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import type { Appointment } from "../../../types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";

interface AppointmentCardProps {
  appointment: Appointment;
  patientName: string;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, newStatus: string) => void;
}

export function AppointmentCard({ appointment, patientName, onDelete, onStatusChange }: AppointmentCardProps) {
  // Extract date and time if it's in a single string (assuming "YYYY-MM-DD HH:MM" format)
  const [datePart, timePart] = appointment.date_time.split(" ");

  return (
    <article className="group relative flex flex-col bg-card border border-border/60 hover:border-primary/40 rounded-2xl p-7 shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 overflow-hidden">
      {/* Decorative top accent line based on status */}
      <div className={`absolute top-0 left-0 right-0 h-1 transition-colors ${
        appointment.status === 'ATTENDED' ? 'bg-emerald-500' :
        appointment.status === 'ABSENT' ? 'bg-rose-500' :
        'bg-slate-300 dark:bg-slate-700'
      }`} />

      <header className="flex flex-col gap-3 mb-5 mt-1">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-accent shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-bold text-lg sm:text-xl text-foreground leading-tight break-words min-w-0 w-full">
              {patientName}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/patients/${appointment.patient_id}`}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all"
              title="Ver Historial Clínico"
              aria-label="Ver Historial Clínico"
            >
              <FileText className="h-4 w-4" />
            </Link>
            <button
              onClick={() => onDelete(appointment.id!)}
              className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-all shrink-0"
              title="Cancelar turno"
              aria-label="Cancelar turno"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status Dropdown Pill */}
        <div className="self-start">
          <Select
            value={appointment.status || "PENDING"}
            onValueChange={(value) => onStatusChange(appointment.id!, value)}
          >
            <SelectTrigger
              aria-label="Cambiar estado del turno"
              className={`w-auto gap-2 cursor-pointer text-xs font-semibold tracking-wide uppercase border rounded-full px-3 py-1.5 shadow-sm focus:ring-offset-1 ${
                appointment.status === 'ATTENDED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                appointment.status === 'ABSENT' ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' :
                'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">PENDIENTE</SelectItem>
              <SelectItem value="ATTENDED">ATENDIDO</SelectItem>
              <SelectItem value="ABSENT">AUSENTE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>
      
      <div className="flex-grow flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-foreground">
          <div className="flex items-center gap-1.5 bg-accent/60 text-primary px-2.5 py-1 rounded-lg">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="font-bold">{datePart}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-accent/60 text-primary px-2.5 py-1 rounded-lg">
            <Clock className="h-3.5 w-3.5" />
            <time dateTime={appointment.date_time} className="font-bold">{timePart || appointment.date_time}</time>
          </div>
        </div>

        {/* Reason Box: remove h-full to prevent overflow, use break-words */}
        <div className="mt-auto pt-4 border-t border-border/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Motivo de consulta
          </span> 
          <p className="text-sm text-foreground/80 break-words leading-relaxed">
            {appointment.reason || <span className="italic opacity-60">Consulta general</span>}
          </p>
        </div>
      </div>
    </article>
  );
}
