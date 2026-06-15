import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Calendar, Activity, FileText } from "lucide-react";
import { getPatientReport, addTreatment, addMedicalReport, getOdontogram } from "../../api/patientApi";
import type { PatientReport, DentalPiece } from "../../types";
import Odontogram from "../../components/Odontogram/Odontogram";
import ToothModal from "../../components/Odontogram/ToothModal";

export function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id || "0");
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<"appointments" | "treatments" | "medical_reports" | "odontogram">("appointments");
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  const [treatmentData, setTreatmentData] = useState({ description: "", price: 0, date_time: new Date().toISOString().split("T")[0] });
  const [reportData, setReportData] = useState({ description: "", date_time: new Date().toISOString().split("T")[0] });
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  const { data: odontogramPieces, isLoading: isOdontogramLoading } = useQuery<DentalPiece[]>({
    queryKey: ["odontogram", patientId],
    queryFn: () => getOdontogram(patientId),
  });

  const { data: report, isLoading } = useQuery<PatientReport>({
    queryKey: ["patientReport", patientId],
    queryFn: () => getPatientReport(patientId),
  });

  const treatmentMutation = useMutation({
    mutationFn: (data: any) => addTreatment(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] });
      setIsTreatmentModalOpen(false);
      setTreatmentData({ description: "", price: 0, date_time: new Date().toISOString().split("T")[0] });
    },
    onError: (error: any) => {
      alert("Error al guardar el tratamiento: " + (error.response?.data?.detail || error.message));
    }
  });

  const reportMutation = useMutation({
    mutationFn: (data: any) => addMedicalReport(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] });
      setIsReportModalOpen(false);
      setReportData({ description: "", date_time: new Date().toISOString().split("T")[0] });
    },
    onError: (error: any) => {
      alert("Error al guardar el parte médico: " + (error.response?.data?.detail || error.message));
    }
  });

  if (isLoading) return <div className="p-8 text-center animate-pulse">Cargando Historia Clínica...</div>;
  if (!report) return <div className="p-8 text-center text-red-500">Paciente no encontrado.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link to="/patients" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Historia Clínica</h2>
          <p className="text-muted-foreground">Paciente: <span className="font-semibold text-foreground">{report.patient.name}</span> (DNI: {report.patient.dni})</p>
        </div>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("appointments")}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === "appointments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Calendar className="h-4 w-4" /> Turnos Previos
        </button>
        <button
          onClick={() => setActiveTab("treatments")}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === "treatments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Activity className="h-4 w-4" /> Tratamientos
        </button>
        <button
          onClick={() => setActiveTab("medical_reports")}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === "medical_reports" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <FileText className="h-4 w-4" /> Partes Médicos
        </button>
        <button
          onClick={() => setActiveTab("odontogram")}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === "odontogram" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-smile"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
          Odontograma
        </button>
      </div>

      <div className="mt-6">
        {/* TAB: Turnos */}
        {activeTab === "appointments" && (
          <div className="space-y-4">
            {report.appointments.length === 0 ? (
              <p className="text-muted-foreground p-6 bg-muted/20 rounded-lg text-center border border-dashed">No hay turnos registrados para este paciente.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.appointments.map(app => (
                  <div key={app.id} className="p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
                    <p className="font-semibold">{new Date(app.date_time).toLocaleString()}</p>
                    <p className="text-sm mt-1">Motivo: {app.reason}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full font-medium ${
                      app.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      app.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-blue-500 text-black dark:bg-blue-500 dark:text-black'
                    }`}>
                      {app.status}
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
              <button onClick={() => setIsTreatmentModalOpen(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Nuevo Tratamiento
              </button>
            </div>
            {report.treatments.length === 0 ? (
              <p className="text-muted-foreground p-6 bg-muted/20 rounded-lg text-center border border-dashed">No hay tratamientos registrados.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">Profesional</th>
                      <th className="px-4 py-3 font-semibold">Descripción</th>
                      <th className="px-4 py-3 font-semibold">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.treatments.map(t => (
                      <tr key={t.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 whitespace-nowrap">{t.date_time}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{t.professional_email || 'Desconocido'}</td>
                        <td className="px-4 py-3">{t.description}</td>
                        <td className="px-4 py-3 font-medium">${t.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: Partes Médicos */}
        {activeTab === "medical_reports" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setIsReportModalOpen(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Nuevo Parte Médico
              </button>
            </div>
            {report.medical_reports.length === 0 ? (
              <p className="text-muted-foreground p-6 bg-muted/20 rounded-lg text-center border border-dashed">No hay partes médicos registrados.</p>
            ) : (
              <div className="grid gap-4">
                {report.medical_reports.map(r => (
                  <div key={r.id} className="p-4 border-l-4 border-l-blue-500 bg-muted/10 rounded-r-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-muted-foreground">{r.date_time}</p>
                      <p className="text-xs bg-blue-500 text-black dark:bg-blue-500 dark:text-black px-2 py-0.5 rounded-full">{r.professional_email || 'Desconocido'}</p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Odontograma */}
        {activeTab === "odontogram" && (
          <div className="space-y-4">
            {isOdontogramLoading ? (
              <p className="text-center p-6 text-muted-foreground animate-pulse">Cargando odontograma...</p>
            ) : (
              <Odontogram 
                pieces={odontogramPieces || []} 
                onToothClick={(toothNumber) => setSelectedTooth(toothNumber)} 
              />
            )}
          </div>
        )}
      </div>

      {/* Modal: Tratamiento */}
      {isTreatmentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Registrar Tratamiento</h3>
            <form onSubmit={(e) => { e.preventDefault(); treatmentMutation.mutate(treatmentData); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha</label>
                  <input type="date" required value={treatmentData.date_time} onChange={e => setTreatmentData({...treatmentData, date_time: e.target.value})} className="w-full border rounded-md px-3 py-2 bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea required value={treatmentData.description} onChange={e => setTreatmentData({...treatmentData, description: e.target.value})} className="w-full border rounded-md px-3 py-2 bg-transparent h-24 resize-none" placeholder="Detalle del tratamiento..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Costo ($)</label>
                  <input type="number" step="0.01" min="0" required value={treatmentData.price} onChange={e => setTreatmentData({...treatmentData, price: parseFloat(e.target.value) || 0})} className="w-full border rounded-md px-3 py-2 bg-transparent" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsTreatmentModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={treatmentMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Parte Médico */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Añadir Parte Médico</h3>
            <form onSubmit={(e) => { e.preventDefault(); reportMutation.mutate(reportData); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha</label>
                  <input type="date" required value={reportData.date_time} onChange={e => setReportData({...reportData, date_time: e.target.value})} className="w-full border rounded-md px-3 py-2 bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Observaciones / Notas Médicas</label>
                  <textarea required value={reportData.description} onChange={e => setReportData({...reportData, description: e.target.value})} className="w-full border rounded-md px-3 py-2 bg-transparent h-32 resize-none" placeholder="Escribe el reporte..."></textarea>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsReportModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={reportMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tooth Details */}
      {selectedTooth && odontogramPieces && (
        <ToothModal 
          patientId={patientId}
          toothNumber={selectedTooth}
          currentCondition={odontogramPieces.find(p => p.tooth_number === selectedTooth)?.condition || 'HEALTHY'}
          onClose={() => setSelectedTooth(null)}
        />
      )}
    </div>
  );
}
