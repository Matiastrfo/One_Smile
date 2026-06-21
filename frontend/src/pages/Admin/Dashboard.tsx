import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Trash2, UserPlus, Users, Package, Pencil, X, Mail, Eye, EyeOff } from "lucide-react";
import api from "../../api/axios";
import { getBoxes } from "../../api/boxApi";
import type { Box } from "../../types";

interface Professional { id: number; email: string; role: string; name: string; }

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("profesional");
  const [editingUser, setEditingUser] = useState<Professional | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editName, setEditName] = useState("");

  const { data: users = [], isLoading } = useQuery<Professional[]>({
    queryKey: ["admin_users"],
    queryFn: async () => { const { data } = await api.get("/api/admin/users"); return data; },
  });

  const { data: boxes = [] } = useQuery<Box[]>({ queryKey: ["boxes"], queryFn: getBoxes });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const currentUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin_users"] });

  const createMutation = useMutation({
    mutationFn: async () => { const { data } = await api.post("/api/admin/users", { email, password, role, name }); return data; },
    onSuccess: () => { invalidate(); setEmail(""); setPassword(""); setName(""); setRole("profesional"); alert("Usuario creado exitosamente"); },
    onError: (err: any) => alert(err.response?.data?.detail || "Error al crear profesional"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: any }) => { const { data } = await api.put(`/api/admin/users/${id}`, body); return data; },
    onSuccess: () => { invalidate(); setEditingUser(null); },
    onError: (err: any) => alert(err.response?.data?.detail || "Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/admin/users/${id}`); },
    onSuccess: invalidate,
    onError: (err: any) => alert(err.response?.data?.detail || "Error al eliminar"),
  });

  // Email config
  const [showEmailPass, setShowEmailPass] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [emailForm, setEmailForm] = useState({ smtp_host: "smtp.gmail.com", smtp_port: 587, smtp_user: "", smtp_password: "", from_name: "OneSmile Odontología", enabled: false });

  const { data: emailConfig } = useQuery({
    queryKey: ["emailConfig"],
    queryFn: async () => { const { data } = await api.get("/api/email/config"); return data; },
    onSuccess: (data: any) => setEmailForm(prev => ({ ...prev, ...data, smtp_password: "" })),
  } as any);

  const saveEmailMutation = useMutation({
    mutationFn: async () => { await api.put("/api/email/config", emailForm); },
    onSuccess: () => alert("✅ Configuración de email guardada"),
    onError: (err: any) => alert(err.response?.data?.detail || "Error al guardar"),
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => { await api.post("/api/email/test", { to: testEmailTo }); },
    onSuccess: () => alert("✅ Email de prueba enviado correctamente"),
    onError: (err: any) => alert(err.response?.data?.detail || "No se pudo enviar"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    createMutation.mutate();
  };

  const openEdit = (u: Professional) => {
    setEditingUser(u);
    setEditEmail(u.email);
    setEditPassword("");
    setEditName(u.name ?? "");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const body: any = { email: editEmail, name: editName };
    if (editPassword) body.password = editPassword;
    updateMutation.mutate({ id: editingUser.id, body });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="border-b pb-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
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
                <label className="text-sm font-medium text-muted-foreground">Nombre completo</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: María García" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="profesional@clinica.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Contraseña Temporal</label>
                <input type="text" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Pass1234" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Rol</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="profesional">Profesional</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button type="submit" disabled={createMutation.isPending}
                className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm shadow-md shadow-primary/30">
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
                            {user.name && <p className="font-semibold text-foreground text-sm">{user.name}</p>}
                            <p className={user.name ? "text-xs text-muted-foreground mt-0.5" : "font-semibold text-foreground text-sm"}>{user.email}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{user.role === "admin" ? "Dueño" : user.role}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {user.role === "admin" && (
                              <span className="text-xs font-semibold text-primary bg-accent border border-primary/20 px-2.5 py-1 rounded-lg">Propietario</span>
                            )}
                            <button onClick={() => openEdit(user)}
                              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar">
                              <Pencil className="h-4 w-4" />
                            </button>
                            {user.id !== currentUser?.id && (
                              <button onClick={() => { if (window.confirm(`¿Eliminar acceso para ${user.email}?`)) deleteMutation.mutate(user.id); }}
                                className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Eliminar">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {hasAssignments && (
                          <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-2">
                            {userBoxesMorning.map(b => (
                              <span key={`m-${b.id}`} className="px-2 py-1 rounded-md bg-blue-500 text-black dark:bg-blue-500 dark:text-black text-xs flex items-center gap-1 font-medium">
                                <Package className="h-3 w-3" />{b.name} (Mañana)
                              </span>
                            ))}
                            {userBoxesAfternoon.map(b => (
                              <span key={`a-${b.id}`} className="px-2 py-1 rounded-md bg-blue-500 text-black dark:bg-blue-500 dark:text-black text-xs flex items-center gap-1 font-medium">
                                <Package className="h-3 w-3" />{b.name} (Tarde)
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
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input hover:bg-muted disabled:opacity-50 transition-colors">
                      Anterior
                    </button>
                    <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input hover:bg-muted disabled:opacity-50 transition-colors">
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="font-bold text-foreground">Editar Profesional</h3>
              <button onClick={() => setEditingUser(null)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Nombre completo</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: María García" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <input type="email" required value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Nueva contraseña <span className="font-normal text-muted-foreground">(dejá vacío para no cambiar)</span>
                </label>
                <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-input rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium shadow-md shadow-primary/30 disabled:opacity-50 transition-all">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Configuración de Email ──────────────────────────────── */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/20">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent text-primary shrink-0">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-base">Recordatorios por Email</h3>
            <p className="text-xs text-muted-foreground">Configurá el servidor SMTP para enviar recordatorios automáticos 24hs antes del turno</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold">Activar recordatorios automáticos</label>
            <button onClick={() => setEmailForm(f => ({ ...f, enabled: !f.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailForm.enabled ? "bg-primary" : "bg-muted"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${emailForm.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Servidor SMTP", key: "smtp_host", placeholder: "smtp.gmail.com" },
              { label: "Puerto", key: "smtp_port", placeholder: "587", type: "number" },
              { label: "Email remitente", key: "smtp_user", placeholder: "tu@gmail.com" },
              { label: "Nombre remitente", key: "from_name", placeholder: "OneSmile Odontología" },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{f.label}</label>
                <input type={f.type ?? "text"} value={(emailForm as any)[f.key]} placeholder={f.placeholder}
                  onChange={e => setEmailForm(prev => ({ ...prev, [f.key]: f.type === "number" ? parseInt(e.target.value) : e.target.value }))}
                  className="w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Contraseña / App Password</label>
              <div className="relative">
                <input type={showEmailPass ? "text" : "password"} value={emailForm.smtp_password} placeholder="••••••••••••"
                  onChange={e => setEmailForm(prev => ({ ...prev, smtp_password: e.target.value }))}
                  className="w-full border border-input bg-background px-3 py-2 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={() => setShowEmailPass(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showEmailPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">Para Gmail usá una <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-primary underline">App Password</a></p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => saveEmailMutation.mutate()} disabled={saveEmailMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 disabled:opacity-50">
              Guardar configuración
            </button>
            <div className="flex items-center gap-2">
              <input type="email" value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)}
                placeholder="email@prueba.com"
                className="border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48" />
              <button onClick={() => testEmailMutation.mutate()} disabled={!testEmailTo || testEmailMutation.isPending}
                className="px-4 py-2 border border-border/60 rounded-xl text-sm font-medium hover:bg-muted/50 disabled:opacity-50">
                {testEmailMutation.isPending ? "Enviando..." : "Enviar prueba"}
              </button>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p>📧 El sistema envía recordatorios automáticamente cada hora a pacientes con turno en las próximas 24hs.</p>
            <p>⚠️ El email se envía solo si el paciente tiene email cargado en sus datos filiatorios.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
