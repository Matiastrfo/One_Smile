import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Trash2, UserPlus, Users, Package } from "lucide-react";
import api from "../../api/axios";
import { getBoxes } from "../../api/boxApi";
import type { Box } from "../../types";

interface Professional {
  id: number;
  email: string;
  role: string;
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data: users = [], isLoading } = useQuery<Professional[]>({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data } = await api.get("/api/admin/users");
      return data;
    },
  });

  const { data: boxes = [] } = useQuery<Box[]>({
    queryKey: ["boxes"],
    queryFn: getBoxes,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const currentUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/admin/users", { email, password, role: "profesional" });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      setEmail("");
      setPassword("");
      alert("Profesional creado exitosamente");
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Error al crear profesional");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Error al eliminar");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    createMutation.mutate();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="border-b pb-4">
        <div className="flex items-center gap-3 text-primary mb-2">
          <ShieldAlert className="h-6 w-6" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Panel de Administrador</h2>
        </div>
        <p className="text-muted-foreground text-sm">Gestiona el acceso de los profesionales al sistema.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Formulario de creación */}
        <div className="md:col-span-1">
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-foreground font-semibold">
              <UserPlus className="h-5 w-5 text-primary" />
              <h3>Nuevo Profesional</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="profesional@clinica.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Contraseña Temporal</label>
                <input 
                  type="text" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Pass1234"
                />
              </div>
              <button 
                type="submit"
                disabled={createMutation.isPending}
                className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                Crear Credenciales
              </button>
            </form>
          </div>
        </div>

        {/* Lista de usuarios */}
        <div className="md:col-span-2">
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-foreground font-semibold">
              <Users className="h-5 w-5 text-primary" />
              <h3>Profesionales Registrados</h3>
            </div>
            
            {isLoading ? (
              <p className="text-muted-foreground text-sm py-4">Cargando usuarios...</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {currentUsers.map(user => {
                    const userBoxesMorning = boxes.filter(b => b.professional_morning_id === user.id);
                    const userBoxesAfternoon = boxes.filter(b => b.professional_afternoon_id === user.id);
                    const hasAssignments = userBoxesMorning.length > 0 || userBoxesAfternoon.length > 0;

                    return (
                      <div key={user.id} className="flex flex-col p-3 border border-border/40 bg-muted/20 rounded-xl hover:bg-muted/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{user.email}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{user.role}</p>
                          </div>
                          {user.role !== "admin" && (
                            <button
                              onClick={() => {
                                if (window.confirm(`¿Eliminar acceso para ${user.email}?`)) {
                                  deleteMutation.mutate(user.id);
                                }
                              }}
                              className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                              title="Eliminar profesional"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          {user.role === "admin" && (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-md">
                              Propietario
                            </span>
                          )}
                        </div>
                        
                        {hasAssignments && (
                          <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-2">
                            {userBoxesMorning.map(b => (
                              <span key={`m-${b.id}`} className="px-2 py-1 rounded-md bg-blue-500 text-black dark:bg-blue-500 dark:text-black text-xs flex items-center gap-1 font-medium">
                                <Package className="h-3 w-3" />
                                {b.name} (Mañana)
                              </span>
                            ))}
                            {userBoxesAfternoon.map(b => (
                              <span key={`a-${b.id}`} className="px-2 py-1 rounded-md bg-blue-500 text-black dark:bg-blue-500 dark:text-black text-xs flex items-center gap-1 font-medium">
                                <Package className="h-3 w-3" />
                                {b.name} (Tarde)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {users.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No hay profesionales registrados.</p>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-4 border-t border-border/40">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
