import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Pencil, Trash2, ArrowRightLeft, X, UserPlus } from "lucide-react";
import type { Box, Contract, DayOfWeek } from "../../types";
import { DAYS, DAY_LABELS } from "../../types";
import { getBoxes, createBox, updateBox, deleteBox } from "../../api/boxApi";
import { getActiveContracts, assignProfessional, removeContract, transferContract } from "../../api/contractApi";
import api from "../../api/axios";

interface Professional { id: number; email: string; role: string; }

interface AssignState { boxId: number; boxName: string; day: DayOfWeek; shift: string; }
interface TransferState {
  contractId: number; professionalEmail: string;
  fromBox: string; fromDay: string; fromShift: string;
}

const SHIFTS = [
  { value: 'MORNING', label: 'Mañana' },
  { value: 'AFTERNOON', label: 'Tarde' },
];

export function BoxesPage() {
  const queryClient = useQueryClient();

  // Box form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [boxName, setBoxName] = useState("");

  // Assign modal
  const [assignState, setAssignState] = useState<AssignState | null>(null);
  const [assignProfId, setAssignProfId] = useState<number | "">("");
  const [assignDuration, setAssignDuration] = useState<number>(6);

  // Transfer modal
  const [transferState, setTransferState] = useState<TransferState | null>(null);
  const [targetBoxId, setTargetBoxId] = useState<number | "">("");
  const [targetDay, setTargetDay] = useState<DayOfWeek>("MONDAY");
  const [targetShift, setTargetShift] = useState("MORNING");
  const [doSwap, setDoSwap] = useState(false);

  const { data: boxes = [], isLoading: loadingBoxes } = useQuery<Box[]>({ queryKey: ["boxes"], queryFn: getBoxes });
  const { data: contracts = [] } = useQuery<Contract[]>({ queryKey: ["contracts"], queryFn: getActiveContracts });
  const { data: users = [] } = useQuery<Professional[]>({
    queryKey: ["admin_users"],
    queryFn: async () => { const { data } = await api.get("/api/admin/users"); return data; },
  });
  const professionals = users.filter(u => u.role === "profesional");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["boxes"] });
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  const createMutation = useMutation({
    mutationFn: createBox,
    onSuccess: () => { invalidate(); resetBoxForm(); },
    onError: (err: any) => alert(err.response?.data?.detail || "Error al crear box"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, box }: { id: number; box: Box }) => updateBox(id, box),
    onSuccess: () => { invalidate(); resetBoxForm(); },
    onError: (err: any) => alert(err.response?.data?.detail || "Error al actualizar box"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteBox,
    onSuccess: invalidate,
    onError: (err: any) => alert(err.response?.data?.detail || "Error al eliminar box"),
  });
  const assignMutation = useMutation({
    mutationFn: assignProfessional,
    onSuccess: () => { invalidate(); setAssignState(null); setAssignProfId(""); setAssignDuration(6); },
    onError: (err: any) => alert(err.response?.data?.detail || "Error al asignar"),
  });
  const removeMutation = useMutation({
    mutationFn: removeContract,
    onSuccess: invalidate,
    onError: (err: any) => alert(err.response?.data?.detail || "Error al eliminar asignación"),
  });
  const transferMutation = useMutation({
    mutationFn: ({ contractId, newBoxId, newShift, newDay, swap }: { contractId: number; newBoxId: number; newShift: string; newDay: DayOfWeek; swap: boolean }) =>
      transferContract(contractId, newBoxId, newShift, newDay, swap),
    onSuccess: () => { invalidate(); setTransferState(null); setTargetBoxId(""); setDoSwap(false); },
    onError: (err: any) => alert(err.response?.data?.detail || "Error al transferir"),
  });

  const resetBoxForm = () => { setIsFormOpen(false); setEditingBox(null); setBoxName(""); };

  const handleBoxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxName) return;
    if (editingBox?.id) { updateMutation.mutate({ id: editingBox.id, box: { name: boxName } }); }
    else { createMutation.mutate({ name: boxName }); }
  };

  const getContract = (boxId: number | undefined, day: DayOfWeek, shift: string) =>
    contracts.find(c => c.box_id === boxId && c.day_of_week === day && c.shift === shift);

  const occupiedByTransfer = (targetBoxId && targetDay && targetShift)
    ? getContract(Number(targetBoxId), targetDay, targetShift)
    : undefined;

  const handleTransfer = () => {
    if (!transferState || !targetBoxId) return;
    transferMutation.mutate({ contractId: transferState.contractId, newBoxId: Number(targetBoxId), newShift: targetShift, newDay: targetDay, swap: doSwap });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="border-b pb-4 flex justify-between items-end">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Boxes</h2>
            <p className="text-muted-foreground text-sm">Horario semanal de cada box (Lunes a Viernes).</p>
          </div>
        </div>
        {!isFormOpen && (
          <button onClick={() => setIsFormOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 py-2.5 rounded-xl transition-all text-sm flex items-center gap-2 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40">
            <Plus className="h-4 w-4" /> Nuevo Box
          </button>
        )}
      </header>

      {isFormOpen && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">{editingBox ? "Editar Box" : "Crear Nuevo Box"}</h3>
          <form onSubmit={handleBoxSubmit} className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Nombre del Box</label>
              <input type="text" required value={boxName} onChange={(e) => setBoxName(e.target.value)} className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: Box 1, Consultorio A..." />
            </div>
            <button type="button" onClick={resetBoxForm} className="px-4 py-2 rounded-xl text-sm font-medium border border-input hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 py-2 rounded-xl transition-all disabled:opacity-50 text-sm shadow-md shadow-primary/30">
              {editingBox ? "Guardar" : "Crear Box"}
            </button>
          </form>
        </div>
      )}

      {loadingBoxes ? (
        <p className="text-muted-foreground text-sm">Cargando boxes...</p>
      ) : (
        <div className="space-y-6">
          {boxes.map(box => (
            <div key={box.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
              {/* Box header */}
              <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary/70" /> {box.name}
                </h3>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingBox(box); setBoxName(box.name); setIsFormOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (window.confirm(`¿Eliminar ${box.name}? Se perderán todos sus contratos.`)) deleteMutation.mutate(box.id!); }} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              {/* Weekly grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Turno</th>
                      {DAYS.map(day => (
                        <th key={day} className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{DAY_LABELS[day]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SHIFTS.map(({ value: shift, label: shiftLabel }) => (
                      <tr key={shift} className="border-b last:border-0">
                        <td className="px-4 py-4 font-semibold text-sm text-muted-foreground uppercase">{shiftLabel}</td>
                        {DAYS.map(day => {
                          const contract = getContract(box.id, day, shift);
                          return (
                            <td key={day} className="px-3 py-4 text-center">
                              {contract ? (
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-sm font-medium text-foreground leading-tight max-w-[150px] truncate" title={contract.professional_email}>{contract.professional_email}</span>
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{contract.months_generated}/{contract.duration_months}m</span>
                                  <div className="flex gap-1.5 mt-0.5">
                                    <button
                                      onClick={() => { setTransferState({ contractId: contract.id, professionalEmail: contract.professional_email!, fromBox: box.name, fromDay: day, fromShift: shift }); setTargetBoxId(""); setTargetDay("MONDAY"); setTargetShift("MORNING"); setDoSwap(false); }}
                                      className="p-1.5 rounded-md bg-accent text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                      title="Transferir"
                                    ><ArrowRightLeft className="h-3.5 w-3.5" /></button>
                                    <button
                                      onClick={() => { if (window.confirm(`¿Quitar a ${contract.professional_email} de este slot?`)) removeMutation.mutate(contract.id); }}
                                      className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                                      title="Quitar"
                                    ><X className="h-3.5 w-3.5" /></button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setAssignState({ boxId: box.id!, boxName: box.name, day, shift }); setAssignProfId(""); setAssignDuration(6); }}
                                  className="flex items-center justify-center mx-auto w-9 h-9 rounded-lg border-2 border-dashed border-border/60 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                  title="Asignar profesional"
                                ><Plus className="h-4 w-4" /></button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {boxes.length === 0 && !isFormOpen && (
            <div className="py-12 text-center border-2 border-dashed rounded-2xl border-border/60 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay boxes creados.</p>
              <button onClick={() => setIsFormOpen(true)} className="text-primary hover:underline text-sm font-medium mt-2">Crear tu primer box</button>
            </div>
          )}
        </div>
      )}

      {/* Assign Modal */}
      {assignState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-lg border border-border/60 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent text-primary"><UserPlus className="h-4 w-4" /></div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Asignar Profesional</h3>
                  <p className="text-xs text-muted-foreground">{assignState.boxName} · {DAY_LABELS[assignState.day]} · {assignState.shift === 'MORNING' ? 'Mañana' : 'Tarde'}</p>
                </div>
              </div>
              <button onClick={() => setAssignState(null)} className="p-1 rounded-md text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Profesional</label>
                <select value={assignProfId} onChange={(e) => setAssignProfId(e.target.value ? Number(e.target.value) : "")} className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Seleccionar...</option>
                  {professionals.map(p => <option key={p.id} value={p.id}>{p.email}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Duración del contrato (meses)</label>
                <input type="number" min="1" value={assignDuration} onChange={(e) => setAssignDuration(Number(e.target.value))} className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button onClick={() => setAssignState(null)} className="px-4 py-2 rounded-xl text-sm font-medium border border-input hover:bg-muted transition-colors">Cancelar</button>
                <button
                  onClick={() => { if (!assignProfId || !assignState) return; assignMutation.mutate({ professional_id: Number(assignProfId), box_id: assignState.boxId, shift: assignState.shift, day_of_week: assignState.day, duration_months: assignDuration }); }}
                  disabled={!assignProfId || assignMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 py-2 rounded-xl transition-all disabled:opacity-50 text-sm shadow-md shadow-primary/30"
                >
                  {assignMutation.isPending ? "Asignando..." : "Asignar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-lg border border-border/60 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent text-primary"><ArrowRightLeft className="h-4 w-4" /></div>
                <h3 className="font-semibold text-foreground">Transferir Profesional</h3>
              </div>
              <button onClick={() => setTransferState(null)} className="p-1 rounded-md text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 bg-muted/20 border-b text-sm">
              <p className="font-medium text-foreground">{transferState.professionalEmail}</p>
              <p className="text-muted-foreground mt-0.5">
                Desde: <span className="font-semibold">{transferState.fromBox}</span> · {DAY_LABELS[transferState.fromDay as DayOfWeek]} · {transferState.fromShift === 'MORNING' ? 'Mañana' : 'Tarde'}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">Los meses restantes se mueven al slot de destino. El historial queda en el slot original.</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Box destino</label>
                  <select value={targetBoxId} onChange={(e) => { setTargetBoxId(e.target.value ? Number(e.target.value) : ""); setDoSwap(false); }} className="w-full bg-background border border-input rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Box...</option>
                    {boxes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Día</label>
                  <select value={targetDay} onChange={(e) => { setTargetDay(e.target.value as DayOfWeek); setDoSwap(false); }} className="w-full bg-background border border-input rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Turno</label>
                  <select value={targetShift} onChange={(e) => { setTargetShift(e.target.value); setDoSwap(false); }} className="w-full bg-background border border-input rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="MORNING">Mañana</option>
                    <option value="AFTERNOON">Tarde</option>
                  </select>
                </div>
              </div>

              {targetBoxId && occupiedByTransfer && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Slot ocupado</p>
                  <p className="text-muted-foreground text-xs mb-3">
                    <span className="font-medium text-foreground">{occupiedByTransfer.professional_email}</span> ya está en este slot. ¿Hacemos un intercambio?
                  </p>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={doSwap} onChange={(e) => setDoSwap(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
                    <span className="text-xs font-medium text-foreground">
                      Sí, intercambiar — <span className="text-muted-foreground font-normal">{transferState.professionalEmail} va al destino y {occupiedByTransfer.professional_email} viene al slot original</span>
                    </span>
                  </label>
                </div>
              )}

              {targetBoxId && !occupiedByTransfer && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Slot disponible
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button onClick={() => setTransferState(null)} className="px-4 py-2 rounded-xl text-sm font-medium border border-input hover:bg-muted transition-colors">Cancelar</button>
                <button
                  onClick={handleTransfer}
                  disabled={!targetBoxId || (!!occupiedByTransfer && !doSwap) || transferMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 py-2 rounded-xl transition-all disabled:opacity-50 text-sm shadow-md shadow-primary/30"
                >
                  {transferMutation.isPending ? "Procesando..." : doSwap ? "Confirmar Intercambio" : "Confirmar Transferencia"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
