import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Pencil, Trash2, Activity, FileText, CalendarPlus, Heart, Save, User, Camera, Wallet, MessageCircle } from "lucide-react";

function whatsappUrl(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
import { useNavigate, useLocation } from "react-router-dom";
import { getPatientReport, addTreatment, updateTreatment, deleteTreatment, getOdontogram, updateTooth, updatePatient, uploadPatientPhoto, getPatientAccount, addPatientPayment, deletePatientPayment } from "../../api/patientApi";
import type { PatientAccount } from "../../types";
import { downloadMedicalHistoryPdf, downloadTreatmentsPdf, downloadOdontogramPdf } from "../../utils/odontogramPdf";
import type { PatientReport, DentalPiece, Treatment, TreatmentType, TreatmentColor, ToothFace } from "../../types";
import Odontogram from "../../components/Odontogram/Odontogram";

export function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id || "0");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState<"filiatorio" | "history" | "treatments" | "odontogram" | "cuenta-corriente">((location.state as any)?.openTab ?? "odontogram");
  const [paymentForm, setPaymentForm] = useState({ date: new Date().toISOString().split("T")[0], amount: "", description: "Pago" });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [odontogramPartialStart, setOdontogramPartialStart] = useState<number | null>(null);
  const [medicalHistory, setMedicalHistory] = useState({ blood_type: "", allergies: "", diseases: "", medications: "", observations: "" });
  const [filiatorio, setFiliatorio] = useState({
    last_name: "", social_security: "", social_security_number: "",
    address: "", province: "", city: "", email: "", birth_date: "",
  });
  const photoInputRef = useRef<HTMLInputElement>(null);
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
      setFiliatorio({
        last_name: p.last_name ?? "",
        social_security: p.social_security ?? "",
        social_security_number: p.social_security_number ?? "",
        address: p.address ?? "",
        province: p.province ?? "",
        city: p.city ?? "",
        email: p.email ?? "",
        birth_date: p.birth_date ?? "",
      });
    }
  }, [report?.patient]);

  const medicalHistoryMutation = useMutation({
    mutationFn: () => updatePatient(patientId, { ...(report!.patient as any), ...medicalHistory }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] }),
    onError: () => alert("Error al guardar la historia clínica"),
  });

  const filiatoryMutation = useMutation({
    mutationFn: () => updatePatient(patientId, { ...(report!.patient as any), ...filiatorio }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] }),
    onError: () => alert("Error al guardar los datos filiatorios"),
  });

  const photoMutation = useMutation({
    mutationFn: (file: File) => uploadPatientPhoto(patientId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patientReport", patientId] }),
    onError: () => alert("Error al subir la foto"),
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


  const { data: account } = useQuery<PatientAccount>({
    queryKey: ["patientAccount", patientId],
    queryFn: () => getPatientAccount(patientId),
    enabled: activeTab === "cuenta-corriente",
  });

  const addPaymentMutation = useMutation({
    mutationFn: () => addPatientPayment(patientId, { date: paymentForm.date, amount: parseFloat(paymentForm.amount), description: paymentForm.description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientAccount", patientId] });
      queryClient.invalidateQueries({ queryKey: ["accountSummary"] });
      setPaymentForm({ date: new Date().toISOString().split("T")[0], amount: "", description: "Pago" });
      setShowPaymentForm(false);
    },
    onError: () => alert("Error al registrar el pago"),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) => deletePatientPayment(patientId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientAccount", patientId] });
      queryClient.invalidateQueries({ queryKey: ["accountSummary"] });
    },
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
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Historia Clínica</h2>
              <p className="text-muted-foreground">Paciente: <span className="font-semibold text-foreground">{report.patient.name}</span> (DNI: {report.patient.dni})</p>
            </div>
            {(report.patient as any).phone && (
              <a
                href={whatsappUrl((report.patient as any).phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-sm font-semibold"
                title={`WhatsApp: ${(report.patient as any).phone}`}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-card border border-border/60 rounded-2xl shadow-sm">
        <button
          onClick={() => setActiveTab("filiatorio")}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 rounded-xl transition-colors ${activeTab === "filiatorio" ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-muted-foreground hover:bg-accent hover:text-primary"}`}
        >
          <User className="h-4 w-4" /> Datos Filiatorios
        </button>
        <button
          onClick={() => setActiveTab("cuenta-corriente")}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 rounded-xl transition-colors ${activeTab === "cuenta-corriente" ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-muted-foreground hover:bg-accent hover:text-primary"}`}
        >
          <Wallet className="h-4 w-4" /> Cuenta Corriente
        </button>
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
        {/* TAB: Datos Filiatorios */}
        {activeTab === "filiatorio" && (
          <div className="space-y-6 max-w-3xl">
            {/* Foto del paciente */}
            <div className="flex items-center gap-6 p-5 bg-card border border-border/60 rounded-2xl">
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) photoMutation.mutate(f); e.target.value = ""; }} />
              <button onClick={() => photoInputRef.current?.click()} className="relative shrink-0 group" title="Cambiar foto">
                {(report.patient as any).photo_path ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}${(report.patient as any).photo_path}`}
                    alt="Foto del paciente"
                    className="h-24 w-24 rounded-2xl object-cover ring-2 ring-primary/30"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-2xl bg-accent flex items-center justify-center text-primary">
                    <User className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </button>
              <div>
                <p className="font-bold text-lg">{filiatorio.last_name ? `${report.patient.name} ${filiatorio.last_name}` : report.patient.name}</p>
                <p className="text-sm text-muted-foreground">DNI: {report.patient.dni || "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">Hacé click en la foto para cambiarla</p>
              </div>
            </div>

            {/* Campos filiatorios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Nombre", value: report.patient.name, disabled: true },
                { label: "Apellido", key: "last_name" },
                { label: "DNI", value: report.patient.dni, disabled: true },
                { label: "Fecha de nacimiento", key: "birth_date", type: "date" },
                { label: "Teléfono", value: (report.patient as any).phone, disabled: true },
                { label: "Correo electrónico", key: "email", type: "email" },
                { label: "Obra social", key: "social_security" },
                { label: "N° de obra social", key: "social_security_number" },
                { label: "Dirección", key: "address" },
                { label: "Localidad", key: "city" },
                { label: "Provincia", key: "province" },
              ].map(f => (
                <div key={f.label} className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">{f.label}</label>
                  <input
                    type={f.type || "text"}
                    disabled={!!f.disabled}
                    value={f.disabled ? (f.value ?? "") : (filiatorio as any)[f.key!] ?? ""}
                    onChange={e => !f.disabled && f.key && setFiliatorio(prev => ({ ...prev, [f.key!]: e.target.value }))}
                    className="w-full border border-input bg-background text-foreground px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => filiatoryMutation.mutate()}
                disabled={filiatoryMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {filiatoryMutation.isPending ? "Guardando..." : "Guardar datos filiatorios"}
              </button>
            </div>
          </div>
        )}

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
                onClick={() => setActiveTab("cuenta-corriente")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/60 text-sm font-semibold hover:bg-accent transition-colors"
              >
                <Wallet className="h-4 w-4 text-primary" />
                Cuenta Corriente
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

        {/* TAB: Cuenta Corriente */}
        {activeTab === "cuenta-corriente" && (() => {
          const entries = account?.entries ?? [];
          let running = 0;
          const rows = entries.map(e => {
            if (e.source === "treatment") running += e.amount;
            else running -= e.amount;
            return { ...e, running };
          });
          const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
          return (
            <div className="space-y-5">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Facturado</p>
                  <p className="text-xl font-bold">{fmt(account?.total_charges ?? 0)}</p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cobrado</p>
                  <p className="text-xl font-bold text-green-600">{fmt(account?.total_payments ?? 0)}</p>
                </div>
                <div className={`rounded-2xl p-4 space-y-0.5 border ${(account?.balance ?? 0) > 0 ? "bg-rose-50 border-rose-200" : "bg-green-50 border-green-200"}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo</p>
                  <p className={`text-xl font-bold ${(account?.balance ?? 0) > 0 ? "text-rose-600" : "text-green-600"}`}>{fmt(account?.balance ?? 0)}</p>
                </div>
              </div>

              {/* Botón registrar pago */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowPaymentForm(v => !v)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg transition-all"
                >
                  <Plus className="h-4 w-4" /> Registrar pago
                </button>
              </div>

              {/* Formulario de pago */}
              {showPaymentForm && (
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
                  <h4 className="font-semibold text-sm">Nuevo pago</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Fecha</label>
                      <input type="date" value={paymentForm.date} onChange={e => setPaymentForm(p => ({ ...p, date: e.target.value }))}
                        className="w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Monto ($)</label>
                      <input type="number" min="0" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="0" className="w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Descripción</label>
                      <input type="text" value={paymentForm.description} onChange={e => setPaymentForm(p => ({ ...p, description: e.target.value }))}
                        className="w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowPaymentForm(false)} className="px-4 py-2 border rounded-xl text-sm hover:bg-muted/50 transition-colors">Cancelar</button>
                    <button
                      onClick={() => addPaymentMutation.mutate()}
                      disabled={!paymentForm.amount || addPaymentMutation.isPending}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {addPaymentMutation.isPending ? "Guardando..." : "Guardar pago"}
                    </button>
                  </div>
                </div>
              )}

              {/* Tabla libro mayor */}
              {rows.length === 0 ? (
                <p className="text-center text-muted-foreground p-8 bg-muted/20 rounded-2xl border border-dashed border-border/60">Sin movimientos registrados.</p>
              ) : (
                <div className="rounded-2xl border border-border/60 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Fecha</th>
                        <th className="px-4 py-3 font-semibold">Detalle</th>
                        <th className="px-4 py-3 font-semibold text-right">Debe</th>
                        <th className="px-4 py-3 font-semibold text-right">Haber</th>
                        <th className="px-4 py-3 font-semibold text-right">Saldo</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {rows.map((row, i) => (
                        <tr key={i} className={`hover:bg-muted/40 transition-colors ${row.source === "payment" ? "bg-green-50/40" : ""}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{row.date}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{row.description}</p>
                            {row.professional_name && <p className="text-xs text-muted-foreground">{row.professional_name}</p>}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {row.source === "treatment" ? fmt(row.amount) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">
                            {row.source === "payment" ? fmt(row.amount) : "—"}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${row.running > 0 ? "text-rose-600" : "text-green-600"}`}>
                            {fmt(row.running)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.source === "payment" && (
                              <button
                                onClick={() => { if (confirm("¿Eliminar este pago?")) deletePaymentMutation.mutate(row.id); }}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

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
