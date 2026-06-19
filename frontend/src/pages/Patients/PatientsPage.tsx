import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Search, FileText, Users, MessageCircle } from "lucide-react";

function whatsappUrl(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
import { getPatients, createPatient, updatePatient, deletePatient } from "../../api/patientApi";
import { Link } from "react-router-dom";
import type { Patient } from "../../types";
import { useAuth } from "../../context/AuthContext";

export function PatientsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  
  const [formData, setFormData] = useState({ name: "", dni: "", phone: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients", debouncedSearch],
    queryFn: () => getPatients(debouncedSearch),
  });


  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Patient }) => updatePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const openModalForCreate = () => {
    setEditingPatient(null);
    setFormData({ name: "", dni: "", phone: "" });
    setIsModalOpen(true);
  };

  const openModalForEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({ name: patient.name, dni: patient.dni, phone: patient.phone ?? "" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPatient && editingPatient.id) {
      updateMutation.mutate({ id: editingPatient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 sm:border-0 sm:pb-0">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Pacientes</h2>
            <p className="text-muted-foreground">Administra la lista de pacientes registrados.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar paciente o DNI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-input bg-background pl-9 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
            />
          </div>
          <button
            onClick={openModalForCreate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium whitespace-nowrap transition-all shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
          >
            <Plus className="h-4 w-4" />
            Nuevo Paciente
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Cargando pacientes...</div>
      ) : (
        <div className="border border-border/60 rounded-2xl bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Nombre</th>
                <th className="px-6 py-3 font-medium">DNI</th>
                <th className="px-6 py-3 font-medium">Teléfono</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No hay pacientes registrados.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-muted-foreground">{p.id}</td>
                    <td className="px-6 py-4 font-medium">{p.name}</td>
                    <td className="px-6 py-4">{p.dni}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.phone ?? <span className="italic text-muted-foreground/50">—</span>}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-flex items-center gap-2">
                      {p.phone && (
                        <a
                          href={whatsappUrl(p.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-md transition-colors"
                          title={`WhatsApp: ${p.phone}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                      <Link
                        to={`/patients/${p.id}`}
                        className="inline-flex items-center justify-center p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-950 rounded-md transition-colors"
                        title="Ver Historia Clínica"
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openModalForEdit(p)}
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {user?.role === 'admin' && (
                        <button 
                          onClick={() => {
                            if (window.confirm("¿Seguro que deseas eliminar este paciente?")) {
                              deleteMutation.mutate(p.id!);
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center gap-3 p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-accent text-primary shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg text-foreground">
                  {editingPatient ? "Editar Paciente" : "Nuevo Paciente"}
                </h3>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre Completo</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-input bg-background px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">DNI</label>
                <input
                  required
                  type="text"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  className="w-full border border-input bg-background px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                  placeholder="Ej. 12345678"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Teléfono <span className="font-normal text-muted-foreground">(opcional)</span></label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-input bg-background px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                  placeholder="Ej. +5491112345678"
                />
              </div>
              <div className="pt-4 mt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 border border-input bg-background rounded-xl hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium transition-all shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
                >
                  {editingPatient ? "Guardar Cambios" : "Crear Paciente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
