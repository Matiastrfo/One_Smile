import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Plus, Phone, Mail, FileText, Upload, X, Check, Trash2, Pencil, Filter, ListChecks } from "lucide-react";
import { getLabs, createLab, updateLab, deleteLab, uploadPriceList, getLabJobs, createLabJob, markJobReceived, deleteLabJob, type Lab, type LabJob } from "../../api/labApi";
import { getPatients } from "../../api/patientApi";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR");
}

function StatusBadge({ status }: { status: "SENT" | "RECEIVED" }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg text-white ${status === "RECEIVED" ? "bg-green-600" : "bg-amber-600"}`}>
      {status === "RECEIVED" ? "Recibido" : "Enviado"}
    </span>
  );
}

export function LabsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navState = location.state as { patientId?: number; patientName?: string } | null;
  const [showLabModal, setShowLabModal] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [viewingLab, setViewingLab] = useState<Lab | null>(null);
  const [patientFilter, setPatientFilter] = useState<{ id: number; name: string } | null>(
    navState?.patientId ? { id: navState.patientId, name: navState.patientName ?? "" } : null
  );

  const { data: labs = [] } = useQuery({ queryKey: ["labs"], queryFn: getLabs });
  const { data: jobs = [] } = useQuery({ queryKey: ["labJobs"], queryFn: getLabJobs });
  const visibleJobs = patientFilter ? jobs.filter(j => j.patient_id === patientFilter.id) : jobs;

  const invalidateLabs = () => queryClient.invalidateQueries({ queryKey: ["labs"] });
  const invalidateJobs = () => queryClient.invalidateQueries({ queryKey: ["labJobs"] });

  const deleteLabMutation = useMutation({
    mutationFn: deleteLab,
    onSuccess: invalidateLabs,
    onError: (err: any) => alert(err.response?.data?.detail || "No se pudo eliminar el laboratorio"),
  });

  const receiveMutation = useMutation({
    mutationFn: markJobReceived,
    onSuccess: invalidateJobs,
  });

  const deleteJobMutation = useMutation({
    mutationFn: deleteLabJob,
    onSuccess: invalidateJobs,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="border-b pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
              <FlaskConical className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Laboratorio</h2>
          </div>
          <p className="text-muted-foreground text-sm">Laboratorios protésicos y trabajos enviados.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJobModal(true)} disabled={labs.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-border/60 rounded-xl text-sm font-medium hover:bg-muted/50 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Registrar trabajo enviado
          </button>
          <button onClick={() => { setEditingLab(null); setShowLabModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30">
            <Plus className="h-4 w-4" /> Nuevo laboratorio
          </button>
        </div>
      </header>

      {patientFilter && (
        <div className="flex items-center gap-2 bg-accent/60 border border-primary/20 rounded-xl px-4 py-2.5 text-sm">
          <Filter className="h-4 w-4 text-primary shrink-0" />
          <span>Mostrando trabajos de <strong>{patientFilter.name}</strong></span>
          <button onClick={() => setPatientFilter(null)} className="ml-auto text-primary font-semibold hover:underline">
            Ver todos
          </button>
        </div>
      )}

      {/* Laboratorios */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {labs.length === 0 && (
          <p className="text-sm text-muted-foreground italic col-span-full">Todavía no cargaste ningún laboratorio.</p>
        )}
        {labs.map(lab => (
          <div key={lab.id} className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-foreground">{lab.name}</h3>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingLab(lab); setShowLabModal(true); }}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => { if (window.confirm(`¿Eliminar el laboratorio ${lab.name}?`)) deleteLabMutation.mutate(lab.id); }}
                  className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {lab.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {lab.phone}</p>}
              {lab.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {lab.email}</p>}
            </div>
            <PriceListControl lab={lab} onUploaded={invalidateLabs} />
            <button onClick={() => setViewingLab(lab)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-border/60 hover:bg-accent transition-colors">
              <ListChecks className="h-3.5 w-3.5" /> Ver trabajos enviados a este laboratorio
            </button>
          </div>
        ))}
      </div>

      {/* Trabajos enviados */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b bg-muted/20">
          <h3 className="font-bold text-base">Trabajos enviados</h3>
        </div>
        <div className="p-5">
          {visibleJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {patientFilter ? "Este paciente no tiene trabajos registrados." : "Todavía no hay trabajos registrados."}
            </p>
          ) : (
            <div className="space-y-2">
              {visibleJobs.map(job => (
                <JobRow key={job.id} job={job} showLabName onReceive={() => receiveMutation.mutate(job.id)} onDelete={() => deleteJobMutation.mutate(job.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showLabModal && (
        <LabModal lab={editingLab} onClose={() => setShowLabModal(false)} onSaved={() => { setShowLabModal(false); invalidateLabs(); }} />
      )}
      {showJobModal && (
        <JobModal labs={labs} defaultPatientId={patientFilter?.id} onClose={() => setShowJobModal(false)} onSaved={() => { setShowJobModal(false); invalidateJobs(); }} />
      )}
      {viewingLab && (
        <LabJobsModal
          lab={viewingLab}
          jobs={jobs.filter(j => j.lab_id === viewingLab.id)}
          onClose={() => setViewingLab(null)}
          onReceive={id => receiveMutation.mutate(id)}
          onDelete={id => deleteJobMutation.mutate(id)}
        />
      )}
    </div>
  );
}

function JobRow({ job, showLabName, onReceive, onDelete }: { job: LabJob; showLabName?: boolean; onReceive: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-border/40 bg-muted/20 rounded-xl">
      <div>
        <p className="text-sm font-semibold text-foreground">{job.patient_name} — {job.description}</p>
        <p className="text-xs text-muted-foreground">
          {showLabName && `${job.lab_name} · `}Enviado {formatDate(job.sent_date)}
          {job.status === "RECEIVED" && job.received_date && ` · Recibido ${formatDate(job.received_date)}`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={job.status} />
        {job.status === "SENT" && (
          <button onClick={onReceive}
            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="Marcar como recibido">
            <Check className="h-4 w-4" />
          </button>
        )}
        <button onClick={() => { if (window.confirm("¿Eliminar este trabajo?")) onDelete(); }}
          className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Eliminar">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function LabJobsModal({ lab, jobs, onClose, onReceive, onDelete }: { lab: Lab; jobs: LabJob[]; onClose: () => void; onReceive: (id: number) => void; onDelete: (id: number) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b shrink-0">
          <h3 className="font-bold text-foreground">Trabajos enviados a {lab.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-2 overflow-y-auto">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Todavía no le enviaste trabajos a este laboratorio.</p>
          ) : (
            jobs.map(job => (
              <JobRow key={job.id} job={job} onReceive={() => onReceive(job.id)} onDelete={() => onDelete(job.id)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PriceListControl({ lab, onUploaded }: { lab: Lab; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadPriceList(lab.id, file),
    onMutate: () => setUploading(true),
    onSuccess: () => { setUploading(false); onUploaded(); },
    onError: (err: any) => { setUploading(false); alert(err.response?.data?.detail || "No se pudo subir la lista de precios"); },
  });

  return (
    <div className="pt-2 border-t border-border/40 flex items-center gap-2">
      {lab.price_list_path ? (
        <a href={`${API_BASE}${lab.price_list_path}`} target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <FileText className="h-3.5 w-3.5" /> Ver lista de precios
        </a>
      ) : (
        <span className="text-xs text-muted-foreground italic">Sin lista de precios</span>
      )}
      <label className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary cursor-pointer">
        <Upload className="h-3.5 w-3.5" /> {uploading ? "Subiendo..." : lab.price_list_path ? "Reemplazar" : "Subir PDF"}
        <input type="file" accept="application/pdf" className="hidden" disabled={uploading}
          onChange={e => { const file = e.target.files?.[0]; if (file) uploadMutation.mutate(file); e.target.value = ""; }} />
      </label>
    </div>
  );
}

function LabModal({ lab, onClose, onSaved }: { lab: Lab | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(lab?.name ?? "");
  const [phone, setPhone] = useState(lab?.phone ?? "");
  const [email, setEmail] = useState(lab?.email ?? "");

  const saveMutation = useMutation({
    mutationFn: () => lab ? updateLab(lab.id, { name, phone, email }) : createLab({ name, phone, email }),
    onSuccess: onSaved,
    onError: (err: any) => alert(err.response?.data?.detail || "No se pudo guardar el laboratorio"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="font-bold text-foreground">{lab ? "Editar laboratorio" : "Nuevo laboratorio"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Nombre</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Laboratorio Dental Sur" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Opcional" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Opcional — se usa para avisarle cuando le mandás un trabajo" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-input rounded-xl hover:bg-muted text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saveMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium shadow-md shadow-primary/30 disabled:opacity-50 transition-all">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobModal({ labs, defaultPatientId, onClose, onSaved }: { labs: Lab[]; defaultPatientId?: number; onClose: () => void; onSaved: () => void }) {
  const [labId, setLabId] = useState(labs[0]?.id ?? 0);
  const [patientId, setPatientId] = useState(defaultPatientId ?? 0);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const { data: patients = [] } = useQuery({ queryKey: ["patients"], queryFn: () => getPatients() });

  const saveMutation = useMutation({
    mutationFn: () => createLabJob({ lab_id: labId, patient_id: patientId, description, notes: notes || undefined }),
    onSuccess: onSaved,
    onError: (err: any) => alert(err.response?.data?.detail || "No se pudo registrar el trabajo"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="font-bold text-foreground">Registrar trabajo enviado</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (patientId) saveMutation.mutate(); }} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Laboratorio</label>
            <select required value={labId} onChange={e => setLabId(Number(e.target.value))}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Paciente</label>
            <select required value={patientId} onChange={e => setPatientId(Number(e.target.value))}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value={0} disabled>Seleccioná un paciente</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Trabajo</label>
            <input type="text" required value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Corona de zirconio, pieza 14" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Notas <span className="font-normal">(opcional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-input rounded-xl hover:bg-muted text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saveMutation.isPending || !patientId}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium shadow-md shadow-primary/30 disabled:opacity-50 transition-all">
              {saveMutation.isPending ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
