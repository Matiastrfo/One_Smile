import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Pencil, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { Box } from "../../types";
import { getBoxes, createBox, updateBox, deleteBox } from "../../api/boxApi";
import api from "../../api/axios";

interface Professional {
  id: number;
  email: string;
  role: string;
}

export function BoxesPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);

  const [name, setName] = useState("");
  const [morningId, setMorningId] = useState<number | "">("");
  const [afternoonId, setAfternoonId] = useState<number | "">("");
  const [contractDurationMorning, setContractDurationMorning] = useState<number>(1);
  const [contractDurationAfternoon, setContractDurationAfternoon] = useState<number>(1);
  const [specialtyMorning, setSpecialtyMorning] = useState("");
  const [specialtyAfternoon, setSpecialtyAfternoon] = useState("");

  // Queries
  const { data: boxes = [], isLoading: loadingBoxes } = useQuery<Box[]>({
    queryKey: ["boxes"],
    queryFn: getBoxes,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<Professional[]>({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data } = await api.get("/api/admin/users");
      return data;
    },
  });

  const professionals = users.filter(u => u.role === "profesional");

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxes"] });
      resetForm();
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Error al crear box");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, box }: { id: number, box: Box }) => updateBox(id, box),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxes"] });
      resetForm();
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Error al actualizar box");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxes"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Error al eliminar box");
    }
  });

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingBox(null);
    setName("");
    setMorningId("");
    setAfternoonId("");
    setContractDurationMorning(1);
    setContractDurationAfternoon(1);
    setSpecialtyMorning("");
    setSpecialtyAfternoon("");
  };

  const handleEdit = (box: Box) => {
    setEditingBox(box);
    setName(box.name);
    setMorningId(box.professional_morning_id || "");
    setAfternoonId(box.professional_afternoon_id || "");
    setContractDurationMorning(box.contract_duration_morning || 1);
    setContractDurationAfternoon(box.contract_duration_afternoon || 1);
    setSpecialtyMorning(box.specialty_morning || "");
    setSpecialtyAfternoon(box.specialty_afternoon || "");
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const boxData: Box = {
      name,
      professional_morning_id: morningId ? Number(morningId) : undefined,
      professional_afternoon_id: afternoonId ? Number(afternoonId) : undefined,
      contract_duration_morning: contractDurationMorning,
      contract_duration_afternoon: contractDurationAfternoon,
      specialty_morning: specialtyMorning || undefined,
      specialty_afternoon: specialtyAfternoon || undefined,
    };

    if (editingBox && editingBox.id) {
      updateMutation.mutate({ id: editingBox.id, box: boxData });
    } else {
      createMutation.mutate(boxData);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="border-b pb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 text-primary mb-2">
            <Package className="h-6 w-6" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Boxes</h2>
          </div>
          <p className="text-muted-foreground text-sm">Administra los boxes físicos y la asignación de profesionales.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 py-2 rounded-xl transition-colors text-sm flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nuevo Box
          </button>
        )}
      </header>

      {isFormOpen && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingBox ? "Editar Box" : "Crear Nuevo Box"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Nombre del Box</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Box 1, Consultorio Principal..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Profesional Asignado (Mañana)</label>
                <select
                  value={morningId}
                  onChange={(e) => setMorningId(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                >
                  <option value="">Ninguno</option>
                  {professionals.map(p => (
                    <option key={p.id} value={p.id}>{p.email}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  value={specialtyMorning}
                  onChange={(e) => setSpecialtyMorning(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Especialidad (Ej: Ortodoncia)"
                  disabled={!morningId}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Profesional Asignado (Tarde)</label>
                <select
                  value={afternoonId}
                  onChange={(e) => setAfternoonId(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                >
                  <option value="">Ninguno</option>
                  {professionals.map(p => (
                    <option key={p.id} value={p.id}>{p.email}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  value={specialtyAfternoon}
                  onChange={(e) => setSpecialtyAfternoon(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Especialidad (Ej: Odontopediatría)"
                  disabled={!afternoonId}
                />
              </div>

              <div className="space-y-1.5 md:col-span-1 pt-2">
                <label className="text-sm font-medium text-muted-foreground">Duración Contrato Mañana (meses)</label>
                <input
                  type="number"
                  min="1"
                  value={contractDurationMorning}
                  onChange={(e) => setContractDurationMorning(Number(e.target.value))}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!morningId}
                />
              </div>

              <div className="space-y-1.5 md:col-span-1 pt-2">
                <label className="text-sm font-medium text-muted-foreground">Duración Contrato Tarde (meses)</label>
                <input
                  type="number"
                  min="1"
                  value={contractDurationAfternoon}
                  onChange={(e) => setContractDurationAfternoon(Number(e.target.value))}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!afternoonId}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <button 
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-input hover:bg-muted transition-colors text-foreground"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {editingBox ? "Guardar Cambios" : "Crear Box"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loadingBoxes ? (
        <p className="text-muted-foreground text-sm">Cargando boxes...</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boxes.map(box => (
            <div key={box.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary/70" />
                    {box.name}
                  </h3>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Turno Mañana</span>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">
                          {box.professional_morning_email || <span className="text-muted-foreground italic">Sin asignar</span>}
                        </span>
                        {box.specialty_morning && (
                          <span className="text-xs text-muted-foreground">{box.specialty_morning}</span>
                        )}
                      </div>
                      {box.professional_morning_id && (
                        <div className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 bg-muted text-muted-foreground">
                          {box.contract_duration_morning} meses
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Turno Tarde</span>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">
                          {box.professional_afternoon_email || <span className="text-muted-foreground italic">Sin asignar</span>}
                        </span>
                        {box.specialty_afternoon && (
                          <span className="text-xs text-muted-foreground">{box.specialty_afternoon}</span>
                        )}
                      </div>
                      {box.professional_afternoon_id && (
                        <div className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 bg-muted text-muted-foreground">
                          {box.contract_duration_afternoon} meses
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t bg-muted/20 p-3 flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(box)}
                  className="p-2 text-blue-500 hover:bg-blue-500/10 dark:text-blue-500 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                  title="Editar box"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`¿Eliminar ${box.name}?`)) {
                      deleteMutation.mutate(box.id!);
                    }
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                  title="Eliminar box"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          
          {boxes.length === 0 && !isFormOpen && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-2xl border-border/60 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay boxes creados.</p>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="text-primary hover:underline text-sm font-medium mt-2"
              >
                Crear tu primer box
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
