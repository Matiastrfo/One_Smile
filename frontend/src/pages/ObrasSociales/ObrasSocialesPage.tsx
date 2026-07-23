import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldPlus, Plus, FileText, Upload, X, Trash2, ScrollText, BadgeCheck } from "lucide-react";
import {
  getObrasSociales, createObraSocial, deleteObraSocial,
  uploadObraSocialArancel, uploadObraSocialNorma,
  deleteObraSocialArancel, deleteObraSocialNorma,
  type ObraSocial,
} from "../../api/obraSocialApi";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { downloadArancelNacionalPdf } from "../../utils/arancelNacionalPdf";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function ObrasSocialesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: obrasSociales = [], isLoading } = useQuery({
    queryKey: ["obrasSociales"],
    queryFn: getObrasSociales,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["obrasSociales"] });

  const deleteMutation = useMutation({
    mutationFn: deleteObraSocial,
    onSuccess: () => { invalidate(); toast.success("Obra social eliminada"); },
    onError: (err: any) => toast.error(err.response?.data?.detail || "No se pudo eliminar"),
  });

  const handleDelete = async (obra: ObraSocial) => {
    if (await confirmDialog({ message: `¿Eliminar la obra social personalizada "${obra.name}"? Se borrarán también sus PDFs.`, confirmLabel: "Eliminar", danger: true })) {
      deleteMutation.mutate(obra.id);
    }
  };

  return (
    <div className="space-y-8">
      <header className="border-b pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
              <ShieldPlus className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Obras Sociales</h2>
          </div>
          <p className="text-muted-foreground text-sm">Catálogo de obras sociales, aranceles y normas de facturación.</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30">
          <Plus className="h-4 w-4" /> Agregar obra social
        </button>
      </header>

      {/* Arancel Nacional de referencia — fijo arriba */}
      <div className="bg-card border border-primary/30 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm bg-accent/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 text-primary shrink-0">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Arancel Nacional de Referencia</h3>
            <p className="text-xs text-muted-foreground">Nomenclador odontológico con códigos y prestaciones (sin precios).</p>
          </div>
        </div>
        <button onClick={downloadArancelNacionalPdf}
          className="flex items-center gap-2 px-4 py-2.5 border border-primary/40 text-primary rounded-xl text-sm font-semibold hover:bg-primary/10 transition-colors whitespace-nowrap">
          <FileText className="h-4 w-4" /> Descargar / Ver
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Cargando obras sociales...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {obrasSociales.length === 0 && (
            <p className="text-sm text-muted-foreground italic col-span-full">No hay obras sociales cargadas.</p>
          )}
          {obrasSociales.map((obra) => (
            <ObraSocialCard key={obra.id} obra={obra} onChanged={invalidate} onDelete={() => handleDelete(obra)} />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddObraSocialModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); invalidate(); }} />
      )}
    </div>
  );
}

function ObraSocialCard({ obra, onChanged, onDelete }: { obra: ObraSocial; onChanged: () => void; onDelete: () => void }) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground">{obra.name}</h3>
          {obra.is_custom && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <BadgeCheck className="h-3 w-3" /> Personalizada
            </span>
          )}
        </div>
        {obra.is_custom && (
          <button onClick={onDelete}
            className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors shrink-0" title="Eliminar">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <PdfControl
        label="Arancel"
        path={obra.arancel_path}
        onUpload={(file) => uploadObraSocialArancel(obra.id, file)}
        onDelete={() => deleteObraSocialArancel(obra.id)}
        onChanged={onChanged}
      />
      <PdfControl
        label="Norma de facturación"
        path={obra.norma_path}
        onUpload={(file) => uploadObraSocialNorma(obra.id, file)}
        onDelete={() => deleteObraSocialNorma(obra.id)}
        onChanged={onChanged}
      />
    </div>
  );
}

function PdfControl({ label, path, onUpload, onDelete, onChanged }: {
  label: string;
  path?: string | null;
  onUpload: (file: File) => Promise<ObraSocial>;
  onDelete: () => Promise<ObraSocial>;
  onChanged: () => void;
}) {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [busy, setBusy] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: onUpload,
    onMutate: () => setBusy(true),
    onSuccess: () => { setBusy(false); onChanged(); },
    onError: (err: any) => { setBusy(false); toast.error(err.response?.data?.detail || `No se pudo subir ${label.toLowerCase()}`); },
  });

  const deleteMutation = useMutation({
    mutationFn: onDelete,
    onMutate: () => setBusy(true),
    onSuccess: () => { setBusy(false); onChanged(); },
    onError: (err: any) => { setBusy(false); toast.error(err.response?.data?.detail || "No se pudo eliminar el archivo"); },
  });

  const handleDelete = async () => {
    if (await confirmDialog({ message: `¿Eliminar el PDF de ${label.toLowerCase()}?`, confirmLabel: "Eliminar", danger: true })) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="pt-2 border-t border-border/40 flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0">{label}</span>
      {path ? (
        <>
          <a href={`${API_BASE}${path}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <FileText className="h-3.5 w-3.5" /> Ver
          </a>
          <button onClick={handleDelete} disabled={busy}
            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors" title="Eliminar PDF">
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <span className="text-xs text-muted-foreground italic">Sin subir</span>
      )}
      <label className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary cursor-pointer">
        <Upload className="h-3.5 w-3.5" /> {busy ? "..." : path ? "Reemplazar" : "Subir PDF"}
        <input type="file" accept="application/pdf" className="hidden" disabled={busy}
          onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadMutation.mutate(file); e.target.value = ""; }} />
      </label>
    </div>
  );
}

function AddObraSocialModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");

  const saveMutation = useMutation({
    mutationFn: () => createObraSocial(name.trim()),
    onSuccess: onSaved,
    onError: (err: any) => toast.error(err.response?.data?.detail || "No se pudo agregar la obra social"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) saveMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center gap-3 p-5 border-b">
          <h3 className="font-bold text-lg text-foreground">Agregar obra social</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nombre</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
              placeholder="Ej. Obra Social del Personal de X"
              autoFocus
            />
          </div>
          <div className="pt-4 mt-2 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border border-input bg-background rounded-xl hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saveMutation.isPending}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium transition-all shadow-md shadow-primary/30">
              Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
