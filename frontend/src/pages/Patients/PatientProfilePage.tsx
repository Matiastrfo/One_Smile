import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Pencil, Trash2, Activity, FileText, CalendarPlus, Heart, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPatientReport, addTreatment, updateTreatment, deleteTreatment, getOdontogram, updateTooth, updatePatient } from "../../api/patientApi";
import { downloadMedicalHistoryPdf, downloadTreatmentsPdf, downloadOdontogramPdf } from "../../utils/odontogramPdf";
import type { PatientReport, DentalPiece, Treatment, TreatmentType, TreatmentColor, ToothFace } from "../../types";
import Odontogram from "../../components/Odontogram/Odontogram";

export function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id || "0");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<"history" | "treatments" | "odontogram">("odontogram");
  const [odontogramPartialStart, setOdontogramPartialStart] = useState<number | null>(null);
  const [medicalHistory, setMedicalHistory] = useState({ blood_type: "", allergies: "", diseases: "", medications: "", observations: "" });
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [treatmentData, setTreatmentData] = useState({ description: "", price: "", date_time: new Date().toISOString().split("T")[0] });

  const { data: odontogramPieces = [], isLoading: isOdontogramLoading } = useQuery<DentalPiece[]>({
    queryKey: ["odontogram", patientId],
    queryFn: () => getOdontogram(patientId),
  });

  const TREATMENT_LABELS: Record<TreatmentType, string | null> = {
    NONE: null,
    CARIES: "Caries",
    FILLING: "Obturación",
    EXTRACTION_PENDING: "Extracción indicada",
    EXTRACTED: "Extraído",
    ABSENT: "Ausente",
    CROWN: "Corona",
    RX: "Radiografía",
    IMPLANT: "Implante",
    PERNO: "Perno",
    ENDODONCIA: "Endodoncia",
    PROTESIS: "Prótesis",
    PROTESIS_PARCIAL: "Prótesis parcial",
    PUENTE: "Puente",
  };

  const autoAddTreatment = (toothNumber: number, treatmentType: TreatmentType, update?: { color: string | null; faces: string[] }) => {
    const label = TREATMENT_LABELS[treatmentType];
    if (!label) return;
    const description = `${label} - Pieza ${toothNumber}`;
    const today = new Date().toISOString().split("T")[0];
    addTreatment(patientId, {
      description, price: 0, date_time: today, tooth_number: toothNumber,
      odontogram_type: treatmentType,
      odontogram_color: update?.color ?? null,
      odontogram_faces: update?.faces ? JSON.stringify(update.faces) : '[]',
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] }))
      .catch(() => {});
  };

  const autoDeleteTreatmentForTooth = (toothNumber: number, archOnly = false, directOnly = false) => {
    const treatments = report?.treatments ?? [];
    const matches = treatments.filter(t => {
      const archTeeth = (t as any).arch_teeth;
      if (archOnly) {
        // Registros nuevos: arch_teeth contiene el diente
        if (archTeeth && archTeeth.split(",").map(Number).includes(toothNumber)) return true;
        // Registros viejos (sin arch_teeth): si el tooth_number coincide y es un tratamiento de arcada
        const archTypes = ['PROTESIS_PARCIAL', 'PUENTE', 'PROTESIS'];
        if (!archTeeth && (t as any).tooth_number === toothNumber && archTypes.includes((t as any).odontogram_type)) return true;
        return false;
      }
      if (directOnly) {
        // Solo borrar el registro directo del diente (no arch records, no overlays de otros)
        return (t as any).tooth_number === toothNumber && !archTeeth;
      }
      if ((t as any).tooth_number === toothNumber) return true;
      if (archTeeth) {
        return archTeeth.split(",").map(Number).includes(toothNumber);
      }
      return false;
    });
    if (matches.length === 0) return;
    Promise.all(
      matches.filter(t => t.id).map(t => deleteTreatment(patientId, t.id!))
    ).then(() => queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] }))
     .catch(() => {});
  };

  const toothMutation = useMutation({
    mutationFn: ({ toothNumber, update }: { toothNumber: number; update: { treatment_type: TreatmentType; color: TreatmentColor | null; faces: ToothFace[] } }) =>
      updateTooth(patientId, toothNumber, update),
    onSuccess: (_, { toothNumber, update }) => {
      setOdontogramPartialStart(null);
      queryClient.invalidateQueries({ queryKey: ["odontogram", patientId] });
      if (update.treatment_type === 'NONE') {
        autoDeleteTreatmentForTooth(toothNumber, false, true);
      } else {
        autoAddTreatment(toothNumber, update.treatment_type, { color: update.color, faces: update.faces });
      }
    },
    onError: () => alert("Error al guardar el cambio en el odontograma"),
  });

  const archMutation = useMutation({
    mutationFn: ({ toothNumbers, update }: { toothNumbers: number[]; update: { treatment_type: TreatmentType; color: TreatmentColor | null; faces: ToothFace[] } }) =>
      Promise.all(toothNumbers.map(n => updateTooth(patientId, n, update))),
    onSuccess: (_, { toothNumbers, update }) => {
      setOdontogramPartialStart(null);
      queryClient.invalidateQueries({ queryKey: ["odontogram", patientId] });
      if (update.treatment_type === 'NONE') {
        toothNumbers.forEach(n => autoDeleteTreatmentForTooth(n, true));
      } else {
        const label = TREATMENT_LABELS[update.treatment_type];
        if (!label) return;
        const description = `${label} - Piezas ${toothNumbers.join(", ")}`;
        const today = new Date().toISOString().split("T")[0];
        addTreatment(patientId, {
          description, price: 0, date_time: today,
          tooth_number: toothNumbers[0],
          odontogram_type: update.treatment_type,
          odontogram_color: update.color ?? null,
          odontogram_faces: '[]',
          arch_teeth: toothNumbers.join(","),
        })
          .then(() => queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] }))
          .catch(() => {});
      }
    },
    onError: () => alert("Error al guardar el cambio en el odontograma"),
  });

  const { data: report, isLoading } = useQuery<PatientReport>({
    queryKey: ["patientReport", patientId],
    queryFn: () => getPatientReport(patientId),
  });

  useEffect(() => {
    if (report) {
      const p = report.patient as any;
      setMedicalHistory({
        blood_type: p.blood_type ?? "",
        allergies: p.allergies ?? "",
        diseases: p.diseases ?? "",
        medications: p.medications ?? "",
        observations: p.observations ?? "",
      });
    }
  }, [report?.patient]);

  const medicalHistoryMutation = useMutation({
    mutationFn: () => updatePatient(patientId, {
      name: report!.patient.name,
      dni: report!.patient.dni,
      phone: (report!.patient as any).phone,
      ...medicalHistory,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] }),
    onError: () => alert("Error al guardar la historia clínica"),
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

  const deleteTreatmentMutation = useMutation({
    mutationFn: (treatmentId: number) => deleteTreatment(patientId, treatmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] });
      queryClient.invalidateQueries({ queryKey: ["odontogram", patientId] });
    },
    onError: () => alert("Error al eliminar el tratamiento"),
  });

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
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 rounded-xl transition-colors ${activeTab === "history" ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-muted-foreground hover:bg-accent hover:text-primary"}`}
        >
          <Heart className="h-4 w-4" /> Historia Clínica
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
        {/* TAB: Historia Clínica */}
        {activeTab === "history" && (
          <div className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Grupo sanguíneo</label>
                <select
                  value={medicalHistory.blood_type}
                  onChange={e => setMedicalHistory({ ...medicalHistory, blood_type: e.target.value })}
                  className="w-full border border-input bg-background text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                >
                  <option value="">No especificado</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Alergias</label>
              <textarea
                value={medicalHistory.allergies}
                onChange={e => setMedicalHistory({ ...medicalHistory, allergies: e.target.value })}
                placeholder="Ej: Penicilina, látex, anestesia local..."
                rows={3}
                className="w-full border border-input bg-background text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Enfermedades / Antecedentes</label>
              <textarea
                value={medicalHistory.diseases}
                onChange={e => setMedicalHistory({ ...medicalHistory, diseases: e.target.value })}
                placeholder="Ej: Diabetes tipo 2, hipertensión, HIV..."
                rows={3}
                className="w-full border border-input bg-background text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Medicamentos actuales</label>
              <textarea
                value={medicalHistory.medications}
                onChange={e => setMedicalHistory({ ...medicalHistory, medications: e.target.value })}
                placeholder="Ej: Metformina 500mg, enalapril 10mg..."
                rows={3}
                className="w-full border border-input bg-background text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Observaciones generales</label>
              <textarea
                value={medicalHistory.observations}
                onChange={e => setMedicalHistory({ ...medicalHistory, observations: e.target.value })}
                placeholder="Notas adicionales sobre el paciente..."
                rows={4}
                className="w-full border border-input bg-background text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-shadow"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => downloadMedicalHistoryPdf({ ...report!.patient as any, ...medicalHistory })}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border/60 bg-muted/40 hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4" />
                Descargar PDF
              </button>
              <button
                onClick={() => medicalHistoryMutation.mutate()}
                disabled={medicalHistoryMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {medicalHistoryMutation.isPending ? "Guardando..." : "Guardar historia clínica"}
              </button>
            </div>
          </div>
        )}

        {/* TAB: Tratamientos */}
        {activeTab === "treatments" && (
          <div className="space-y-4">
            <div className="flex justify-end gap-3">
              <button
                onClick={() => downloadTreatmentsPdf(report.patient.name, report.treatments)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border/60 bg-muted/40 hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4" /> Descargar PDF
              </button>
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
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                          <button onClick={() => openTreatmentModalForEdit(t)} className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-accent text-primary hover:bg-accent/70 transition-colors" title="Editar tratamiento">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm("¿Eliminár este tratamiento?")) deleteTreatmentMutation.mutate(t.id!) }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Eliminar tratamiento"
                          >
                            <Trash2 className="h-4 w-4" />
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
            <div className="flex justify-end gap-3">
              <button
                onClick={() => downloadOdontogramPdf(report.patient.name, odontogramPieces)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border/60 bg-muted/40 hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4" />
                Informe PDF
              </button>
              <button
                onClick={() => navigate('/appointments', { state: { preselectedPatientId: patientId } })}
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
                treatments={report?.treatments ?? []}
                onToothUpdate={(toothNumber, update) =>
                  toothMutation.mutate({ toothNumber, update })
                }
                onArchUpdate={(toothNumbers, update) =>
                  archMutation.mutate({ toothNumbers, update })
                }
                partialStart={odontogramPartialStart}
                onSetPartialStart={setOdontogramPartialStart}
                onAddOverlay={(toothNumber, update) =>
                  autoAddTreatment(toothNumber, update.treatment_type, { color: update.color, faces: update.faces })
                }
                onDeleteTreatment={(treatmentId) =>
                  deleteTreatmentMutation.mutate(treatmentId)
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
