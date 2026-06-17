import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Pencil, Calendar, Activity, FileText, CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPatientReport, addTreatment, updateTreatment, getOdontogram, updateTooth } from "../../api/patientApi";
import type { PatientReport, DentalPiece, Treatment, TreatmentType, TreatmentColor, ToothFace } from "../../types";
import Odontogram from "../../components/Odontogram/Odontogram";

export function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id || "0");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<"appointments" | "treatments" | "odontogram">("appointments");
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [treatmentData, setTreatmentData] = useState({ description: "", price: "", date_time: new Date().toISOString().split("T")[0] });

  const { data: odontogramPieces = [], isLoading: isOdontogramLoading } = useQuery<DentalPiece[]>({
    queryKey: ["odontogram", patientId],
    queryFn: () => getOdontogram(patientId),
  });

  const toothMutation = useMutation({
    mutationFn: ({ toothNumber, update }: { toothNumber: number; update: { treatment_type: TreatmentType; color: TreatmentColor | null; faces: ToothFace[] } }) =>
      updateTooth(patientId, toothNumber, update),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["odontogram", patientId] }),
    onError: () => alert("Error al guardar el cambio en el odontograma"),
  });

  const archMutation = useMutation({
    mutationFn: ({ toothNumbers, update }: { toothNumbers: number[]; update: { treatment_type: TreatmentType; color: TreatmentColor | null; faces: ToothFace[] } }) =>
      Promise.all(toothNumbers.map(n => updateTooth(patientId, n, update))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["odontogram", patientId] }),
    onError: () => alert("Error al guardar el cambio en el odontograma"),
  });

  const { data: report, isLoading } = useQuery<PatientReport>({
    queryKey: ["patientReport", patientId],
    queryFn: () => getPatientReport(patientId),
  });

  const closeTreatmentModal = () => {
    setIsTreatmentModalOpen(false);
    setEditingTreatment(null);
    setTreatmentData({ description: "", price: "", date_time: new Date().toISOString().split("T")[0] });
  };

  const openTreatmentModalForCreate = () => {
    setEditingTreatment(null);
    setTreatmentData({ description: "", price: "", date_time: new Date().toISOString().split("T")[0] });
    setIsTreatmentModalOpen(true);
  };

  const openTreatmentModalForEdit = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setTreatmentData({
      description: treatment.description,
      price: String(treatment.price ?? ""),
      date_time: treatment.date_time,
    });
    setIsTreatmentModalOpen(true);
  };

  const treatmentMutation = useMutation({
    mutationFn: (data: { description: string; price: string; date_time: string }) => {
      const payload = { ...data, price: parseFloat(data.price) || 0 };
      return editingTreatment?.id
        ? updateTreatment(patientId, editingTreatment.id, payload)
        : addTreatment(patientId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] });
      closeTreatmentModal();
    },
    onError: (error: any) => {
      alert("Error al guardar el tratamiento: " + (error.response?.data?.detail || error.message));
    }
  });


  if (isLoading) return <div className="p-8 text-center animate-pulse">Cargando Historia Clínica...</div>;
  if (!report) return <div className="p-8 text-center text-red-500">Paciente no encontrado.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link to="/patients" className="p-2 hover:bg-accent hover:text-primary rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Historia Clínica</h2>
            <p className="text-muted-foreground">Paciente: <span className="font-semibold text-foreground">{report.patient.name}</span> (DNI: {report.patient.dni})</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-card border border-border/60 rounded-2xl shadow-sm">
        <button
          onClick={() => setActiveTab("appointments")}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 rounded-xl transition-colors ${activeTab === "appointments" ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-muted-foreground hover:bg-accent hover:text-primary"}`}
        >
          <Calendar className="h-4 w-4" /> Turnos Previos
        </button>
        <button
          onClick={() => setActiveTab("treatments")}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 rounded-xl transition-colors ${activeTab === "treatments" ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-muted-foreground hover:bg-accent hover:text-primary"}`}
        >
          <Activity className="h-4 w-4" /> Tratamientos
        </button>
        <button
          onClick={() => setActiveTab("odontogram")}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 rounded-xl transition-colors ${activeTab === "odontogram" ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-muted-foreground hover:bg-accent hover:text-primary"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
          Odontograma
        </button>
      </div>

      <div className="mt-6">
        {/* TAB: Turnos */}
        {activeTab === "appointments" && (
          <div className="space-y-4">
            {report.appointments.length === 0 ? (
              <p className="text-muted-foreground p-6 bg-muted/20 rounded-2xl text-center border border-dashed border-border/60">No hay turnos registrados para este paciente.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.appointments.map(app => (
                  <div key={app.id} className="p-4 border border-border/60 rounded-2xl bg-card shadow-sm hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent text-primary shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <p className="font-semibold">{new Date(app.date_time).toLocaleString()}</p>
                    </div>
                    <p className="text-sm mt-1 text-muted-foreground">Motivo: {app.reason}</p>
                    <span className={`inline-block mt-2 px-2.5 py-1 text-xs rounded-full font-semibold uppercase tracking-wide ${
                      app.status === 'ATTENDED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      app.status === 'ABSENT' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}>
                      {app.status === 'ATTENDED' ? 'Atendido' :
                       app.status === 'ABSENT' ? 'Ausente' :
                       app.status === 'CANCELLED' ? 'Cancelado' :
                       'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Tratamientos */}
        {activeTab === "treatments" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={openTreatmentModalForCreate} className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-shadow">
                <Plus className="h-4 w-4" /> Nuevo Tratamiento
              </button>
            </div>
            {report.treatments.length === 0 ? (
              <p className="text-muted-foreground p-6 bg-muted/20 rounded-2xl text-center border border-dashed border-border/60">No hay tratamientos registrados.</p>
            ) : (
              <div className="rounded-2xl border border-border/60 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">Profesional</th>
                      <th className="px-4 py-3 font-semibold">Descripción</th>
                      <th className="px-4 py-3 font-semibold">Costo</th>
                      <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {report.treatments.map(t => (
                      <tr key={t.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 whitespace-nowrap">{t.date_time}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{t.professional_email || 'Desconocido'}</td>
                        <td className="px-4 py-3">{t.description}</td>
                        <td className="px-4 py-3 font-medium">${t.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openTreatmentModalForEdit(t)} className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-accent text-primary hover:bg-accent/70 transition-colors" title="Editar tratamiento">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


        {/* TAB: Odontograma */}
        {activeTab === "odontogram" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => navigate('/appointments')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/30"
              >
                <CalendarPlus className="h-4 w-4" />
                Agendar turno
              </button>
            </div>
            {isOdontogramLoading ? (
              <p className="text-center p-6 text-muted-foreground animate-pulse">Cargando odontograma...</p>
            ) : (
              <Odontogram
                pieces={odontogramPieces}
                patientName={report?.patient.name ?? ''}
                onToothUpdate={(toothNumber, update) =>
                  toothMutation.mutate({ toothNumber, update })
                }
                onArchUpdate={(toothNumbers, update) =>
                  archMutation.mutate({ toothNumbers, update })
                }
              />
            )}
          </div>
        )}
      </div>

      {/* Modal: Tratamiento */}
      {isTreatmentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-accent text-primary shrink-0">
                {editingTreatment ? <Pencil className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
              </div>
              <h3 className="text-lg font-bold">{editingTreatment ? "Editar Tratamiento" : "Registrar Tratamiento"}</h3>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); treatmentMutation.mutate(treatmentData); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha</label>
                  <input type="date" required value={treatmentData.date_time} onChange={e => setTreatmentData({...treatmentData, date_time: e.target.value})} className="w-full border rounded-xl px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea required value={treatmentData.description} onChange={e => setTreatmentData({...treatmentData, description: e.target.value})} className="w-full border rounded-xl px-3 py-2 bg-background h-24 resize-none focus:ring-2 focus:ring-primary focus:border-primary outline-none" placeholder="Detalle del tratamiento..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Costo ($)</label>
                  <input type="text" inputMode="decimal" required value={treatmentData.price} onChange={e => setTreatmentData({...treatmentData, price: e.target.value})} placeholder="0.00" className="w-full border rounded-xl px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeTreatmentModal} className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors">Cancelar</button>
                <button type="submit" disabled={treatmentMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-shadow disabled:opacity-60">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
