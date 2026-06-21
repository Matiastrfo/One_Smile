import { useState } from "react";
import { Plus, Clock, CheckCircle2, XCircle, Trash2, FileText, Download, StickyNote, X } from "lucide-react";
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
  onStatusChange: (id: number, status: string, notes?: string) => void;
}

const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const WEEKDAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const STATUS_CONFIG = {
  PENDING:   { label: "Pendiente",  icon: Clock,        cls: "bg-slate-500 text-white border-slate-500" },
  ATTENDED:  { label: "Atendido",   icon: CheckCircle2, cls: "bg-emerald-500 text-white border-emerald-500" },
  ABSENT:    { label: "Ausente",    icon: XCircle,      cls: "bg-rose-500 text-white border-rose-500" },
  CANCELLED: { label: "Cancelado",  icon: XCircle,      cls: "bg-amber-500 text-white border-amber-500" },
};

export function DayPanel({ date, appointments, getPatientName, onAdd, onDelete, onStatusChange }: DayPanelProps) {
  const { user } = useAuth();
  const sorted = [...appointments].sort((a, b) => a.date_time.localeCompare(b.date_time));

  const [notesModal, setNotesModal] = useState<{ apptId: number; status: string; notes: string } | null>(null);

  const handleStatusChange = (apptId: number, newStatus: string, currentNotes?: string) => {
    if (newStatus === "ATTENDED" || newStatus === "ABSENT") {
      setNotesModal({ apptId, status: newStatus, notes: currentNotes ?? "" });
    } else {
      onStatusChange(apptId, newStatus);
    }
  };

  const confirmStatusChange = () => {
    if (!notesModal) return;
    onStatusChange(notesModal.apptId, notesModal.status, notesModal.notes ?? "");
    setNotesModal(null);
  };

  return (
    <>
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{WEEKDAYS[date.getDay()]}</p>
            <h3 className="text-lg font-bold text-foreground leading-tight">
              {date.getDate()} de {MONTHS[date.getMonth()]} {date.getFullYear()}
            </h3>
          </div>
          <button onClick={onAdd} className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-3 py-2 rounded-xl text-sm transition-all shadow-md shadow-primary/30">
            <Plus className="h-4 w-4" /> Agendar
          </button>
        </div>

        <div className="flex-1 divide-y divide-border/40 overflow-y-auto max-h-[500px]">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin turnos este día</p>
              <button onClick={onAdd} className="text-primary text-xs hover:underline mt-2 font-medium">+ Agendar el primero</button>
            </div>
          ) : sorted.map(appt => {
            const time = appt.date_time.split(" ")[1] ?? "";
            const status = (appt.status ?? "PENDING") as keyof typeof STATUS_CONFIG;
            const { icon: Icon, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

            return (
              <div key={appt.id} className="flex items-start gap-3 px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="text-center shrink-0 w-12">
                  <span className="text-sm font-bold text-foreground">{time}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm leading-tight truncate">{getPatientName(appt.patient_id)}</p>
                  {appt.reason && (
                    <p className="text-xs text-foreground/70 mt-0.5 font-medium">
                      📋 {appt.reason}
                    </p>
                  )}
                  {appt.notes && (
                    <div className="mt-1.5 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      <StickyNote className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-snug">{appt.notes}</p>
                    </div>
                  )}
                  <Select value={status} onValueChange={val => handleStatusChange(appt.id!, val, appt.notes)}>
                    <SelectTrigger className={`mt-2 w-fit gap-1.5 cursor-pointer text-xs font-semibold tracking-wide uppercase border rounded-full px-3 py-1 h-auto shadow-sm focus:ring-offset-1 ${cls}`}>
                      <Icon className="h-3 w-3" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="ATTENDED">Atendido</SelectItem>
                      <SelectItem value="ABSENT">Ausente</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setNotesModal({ apptId: appt.id!, status: appt.status ?? "PENDING", notes: appt.notes ?? "" })}
                    className="p-1.5 text-muted-foreground hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                    title="Agregar / editar nota"
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => downloadAppointmentPdf(appt, getPatientName(appt.patient_id), user?.name || user?.email || '', logoUrl)}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="Descargar PDF">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <Link to={`/patients/${appt.patient_id}`}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="Ver historial">
                    <FileText className="h-3.5 w-3.5" />
                  </Link>
                  <button onClick={() => onDelete(appt.id!)}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Eliminar">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal notas */}
      {notesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-base">
                  {notesModal.status === "ATTENDED" || notesModal.status === "ABSENT"
                    ? `Nota — ${notesModal.status === "ATTENDED" ? "Atendido" : "Ausente"}`
                    : "Nota del turno"}
                </h3>
              </div>
              <button onClick={() => setNotesModal(null)} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <StickyNote className="h-4 w-4 text-primary" />
                Nota de la consulta <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                autoFocus
                rows={4}
                value={notesModal.notes}
                onChange={e => setNotesModal(m => m ? { ...m, notes: e.target.value } : m)}
                placeholder="Ej: Se realizó limpieza, paciente con buen estado general..."
                className="w-full border border-input bg-background px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setNotesModal(null)}
                className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmStatusChange}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${notesModal.status === "ATTENDED" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
