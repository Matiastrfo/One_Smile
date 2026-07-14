import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HardDrive, RotateCcw, FolderOpen, History } from "lucide-react";
import { getBackupConfig, saveBackupConfig, runBackupNow, listBackups, restoreBackup } from "../../api/backupApi";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export function BackupsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [form, setForm] = useState({ destination_path: "", enabled: true, keep_count: 30 });

  const { data: config } = useQuery({ queryKey: ["backupConfig"], queryFn: getBackupConfig });
  const { data: backups = [] } = useQuery({ queryKey: ["backupList"], queryFn: listBackups });

  useEffect(() => {
    if (config) {
      setForm({
        destination_path: config.is_default_path ? "" : config.destination_path,
        enabled: config.enabled,
        keep_count: config.keep_count,
      });
    }
  }, [config]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["backupConfig"] });
    queryClient.invalidateQueries({ queryKey: ["backupList"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => saveBackupConfig(form),
    onSuccess: () => { invalidate(); toast.success("Configuración de backups guardada"); },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al guardar"),
  });

  const runMutation = useMutation({
    mutationFn: runBackupNow,
    onSuccess: () => { invalidate(); toast.success("Backup creado correctamente"); },
    onError: (err: any) => toast.error(err.response?.data?.detail || "No se pudo crear el backup"),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreBackup,
    onSuccess: () => { invalidate(); toast.success("Base de datos restaurada correctamente"); },
    onError: (err: any) => toast.error(err.response?.data?.detail || "No se pudo restaurar el backup"),
  });

  const handleRestore = async (filename: string) => {
    const confirmed = await confirmDialog({
      message: `¿Seguro que querés restaurar la base de datos desde "${filename}"? Se reemplazarán todos los datos actuales por los de este backup. Antes se generará una copia de seguridad automática de la base actual.`,
      confirmLabel: "Restaurar",
      danger: true,
    });
    if (confirmed) {
      restoreMutation.mutate(filename);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="border-b pb-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
            <HardDrive className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Copias de Seguridad</h2>
        </div>
        <p className="text-muted-foreground text-sm">Protegé los datos de la clínica ante una falla del disco o un borrado accidental.</p>
      </header>

      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold">Activar backups automáticos</label>
            <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? "bg-primary" : "bg-muted"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" /> Carpeta de destino
              </label>
              <input type="text" value={form.destination_path}
                placeholder={config?.is_default_path ? config.destination_path : "Dejar vacío para usar la carpeta por defecto"}
                onChange={e => setForm(prev => ({ ...prev, destination_path: e.target.value }))}
                className="w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <p className="text-[10px] text-muted-foreground">
                Por defecto se guarda en <span className="font-mono">Documentos\ONE Smile\Backups</span>. Si tenés Google Drive o OneDrive sincronizado, apuntá acá esa carpeta para quedar cubierto también si se rompe el disco.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Cantidad de backups a conservar</label>
              <input type="number" min={1} value={form.keep_count}
                onChange={e => setForm(prev => ({ ...prev, keep_count: parseInt(e.target.value) || 1 }))}
                className="w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 disabled:opacity-50">
              Guardar configuración
            </button>
            <button onClick={() => runMutation.mutate()} disabled={runMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 border border-border/60 rounded-xl text-sm font-medium hover:bg-muted/50 disabled:opacity-50">
              <RotateCcw className="h-4 w-4" /> {runMutation.isPending ? "Generando..." : "Hacer backup ahora"}
            </button>
          </div>

          <div className="bg-muted/30 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p>Se genera un backup automáticamente al abrir la app y una vez por día mientras quede abierta.</p>
            <p>Solo se conservan los últimos {form.keep_count} backups; los más viejos se borran solos.</p>
            {config?.last_backup_at && <p>Último backup: {formatDate(config.last_backup_at)}</p>}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b bg-muted/20">
          <h3 className="font-bold text-base">Backups existentes</h3>
        </div>
        <div className="p-5">
          {backups.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Todavía no hay backups generados.</p>
          ) : (
            <div className="space-y-2">
              {backups.map(b => (
                <div key={b.filename} className="flex items-center justify-between p-3 border border-border/40 bg-muted/20 rounded-xl text-sm">
                  <span className="font-mono text-xs">{b.filename}</span>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatDate(b.created_at)}</span>
                    <span>{formatSize(b.size_bytes)}</span>
                    <button
                      onClick={() => handleRestore(b.filename)}
                      disabled={restoreMutation.isPending}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 border border-red-300 text-red-600 dark:text-red-400 dark:border-red-900 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 transition-colors"
                      title="Restaurar este backup"
                    >
                      <History className="h-3.5 w-3.5" /> Restaurar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
