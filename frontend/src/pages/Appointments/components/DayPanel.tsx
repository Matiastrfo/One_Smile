import { useState } from "react";
import { Plus, Clock, CheckCircle2, XCircle, Trash2, FileText, Download, StickyNote, X, Mail, MoreHorizontal } from "lucide-react";
import api from "../../../api/axios";
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
  getPatientEmail?: (id: number) => string;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string, notes?: string) => void;
  professionalName?: string;
}

const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const WEEKDAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const STATUS_CONFIG = {
  PENDING:   { label: "Pendiente",  icon: Clock,        cls: "bg-slate-100 text-slate-600 border-slate-200",        dot: "bg-slate-400" },
  ATTENDED:  { label: "Atendido",   icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500" },
  ABSENT:    { label: "Ausente",    icon: XCircle,      cls: "bg-rose-100 text-rose-700 border-rose-200",           dot: "bg-rose-500" },
  CANCELLED: { label: "Cancelado",  icon: XCircle,      cls: "bg-amber-100 text-amber-700 border-amber-200",        dot: "bg-amber-500" },
};

export function DayPanel({ date, appointments, getPatientName, getPatientEmail, onAdd, onDelete, onStatusChange, professionalName }: DayPanelProps) {
  const { user } = useAuth();
  const sorted = [...appointments].sort((a, b) => a.date_time.localeCompare(b.date_time));

  const [notesModal, setNotesModal] = useState<{ apptId: number; status: string; notes: string } | null>(null);
  const [sendingReminder, setSendingReminder] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const sendReminder = async (appt: Appointment) => {
    const email = getPatientEmail?.(appt.patient_id);
    if (!email) { alert("Este paciente no tiene email cargado en sus datos filiatorios."); return; }
    setSendingReminder(appt.id!);
    try {
      await api.post("/api/email/reminder", {
        patient_name: getPatientName(appt.patient_id),
        patient_email: email,
        date_time: appt.date_time,
        professional_name: professionalName ?? user?.name ?? user?.email ?? "",
        reason: appt.reason ?? "",
      });
      alert("Recordatorio enviado correctamente");
    } catch (e: any) {
      alert(e.response?.data?.detail || "Error al enviar el recordatorio.");
    } finally {
      setSendingReminder(null);
    }
  };

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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{WEEKDAYS[date.getDay()]}</p>
            <h3 className="text-lg font-bold text-foreground leading-tight">
              {date.getDate()} de {MONTHS[date.getMonth()]} {date.getFullYear()}
            </h3>
          </div>
          <button onClick={onAdd} className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-md shadow-primary/30">
            <Plus className="h-4 w-4" /> Agendar
          </button>
        </div>

        {/* Lista de turnos */}
        <div className="flex-1 divide-y divide-border/30 overflow-y-auto max-h-[520px]">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <Clock className="h-9 w-9 mb-2 opacity-20" />
              <p className="text-sm font-medium">Sin turnos este día</p>
              <button onClick={onAdd} className="text-primary text-xs hover:underline mt-2 font-semibold">
                + Agendar el primero
              </button>
            </div>
          ) : sorted.map(appt => {
            const time = appt.date_time.split(" ")[1]?.slice(0, 5) ?? "";
            const status = (appt.status ?? "PENDING") as keyof typeof STATUS_CONFIG;
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

            return (
              <div
                key={appt.id}
                className="group px-4 py-3 hover:bg-muted/30 transition-colors relative"
                onClick={() => openMenu !== appt.id && setOpenMenu(null)}
              >
                <div className="flex items-start gap-3">
                  {/* Hora */}
                  <div className="shrink-0 pt-0.5">
                    <span className="text-sm font-bold text-foreground tabular-nums">{time}</span>
                  </div>

                  {/* Contenido principal */}
                  <div className="flex-1 min-w-0">
                    {/* Nombre + estado */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground truncate max-w-[140px]">
                        {getPatientName(appt.patient_id)}
                      </span>
                      <Select value={status} onValueChange={val => handleStatusChange(appt.id!, val, appt.notes)}>
                        <SelectTrigger className={`w-fit gap-1 cursor-pointer text-[11px] font-semibold border rounded-full px-2.5 py-0.5 h-auto focus:ring-0 focus:ring-offset-0 ${cfg.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} shrink-0`} />
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

                    {/* Motivo */}
                    {appt.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{appt.reason}</p>
                    )}

                    {/* Nota */}
                    {appt.notes && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 max-w-full">
                        <StickyNote className="h-3 w-3 shrink-0" />
                        <span className="truncate">{appt.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones — visibles on hover */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setNotesModal({ apptId: appt.id!, status: appt.status ?? "PENDING", notes: appt.notes ?? "" }); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-50 transition-colors"
                      title="Nota"
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                    </button>

                    {/* Menú secundario */}
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === appt.id ? null : appt.id!); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Más acciones"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                      {openMenu === appt.id && (
                        <div className="absolute right-0 top-8 z-50 bg-card border border-border/60 rounded-xl shadow-lg py-1 w-44" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { sendReminder(appt); setOpenMenu(null); }} disabled={sendingReminder === appt.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left disabled:opacity-50">
                            <Mail className="h-3.5 w-3.5 text-blue-500" /> Enviar recordatorio
                          </button>
                          <button onClick={() => { downloadAppointmentPdf(appt, getPatientName(appt.patient_id), user?.name || user?.email || '', logoUrl); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left">
                            <Download className="h-3.5 w-3.5 text-primary" /> Descargar PDF
                          </button>
                          <Link to={`/patients/${appt.patient_id}`} onClick={() => setOpenMenu(null)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
                            <FileText className="h-3.5 w-3.5 text-primary" /> Ver historia clínica
                          </Link>
                          <div className="border-t border-border/40 my-1" />
                          <button onClick={() => { onDelete(appt.id!); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-rose-50 text-rose-600 transition-colors text-left">
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar turno
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
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
                <h3 className="font-bold text-base">Nota del turno</h3>
              </div>
              <button onClick={() => setNotesModal(null)} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
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
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg transition-all">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
