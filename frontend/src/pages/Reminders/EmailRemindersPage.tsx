import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, Eye, EyeOff, MessageCircle } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../context/ToastContext";

const MASKED_PASSWORD = "••••••••";

export function EmailRemindersPage() {
  const toast = useToast();
  const [showEmailPass, setShowEmailPass] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [emailForm, setEmailForm] = useState({ smtp_host: "smtp.gmail.com", smtp_port: 587, smtp_user: "", smtp_password: "", from_name: "OneSmile Odontología", enabled: false, whatsapp_number: "" });

  const { data: emailConfig } = useQuery({
    queryKey: ["emailConfig"],
    queryFn: async () => { const { data } = await api.get("/api/email/config"); return data; },
  });

  useEffect(() => {
    if (emailConfig) {
      // El backend devuelve la contraseña enmascarada (••••••••) si hay una guardada, o
      // vacío si no. Mostramos esa máscara tal cual en vez de forzar el campo a vacío —
      // así el usuario ve que hay una contraseña cargada sin que se la mandemos de vuelta
      // sin querer (ver saveEmailMutation, que la reemplaza por "" si no la tocó).
      setEmailForm(prev => ({ ...prev, ...emailConfig, smtp_password: emailConfig.smtp_password || "" }));
    }
  }, [emailConfig]);

  const saveEmailMutation = useMutation({
    mutationFn: async () => {
      const body = { ...emailForm, smtp_password: emailForm.smtp_password === MASKED_PASSWORD ? "" : emailForm.smtp_password };
      await api.put("/api/email/config", body);
    },
    onSuccess: () => toast.success("Configuración de email guardada"),
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al guardar"),
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => { await api.post("/api/email/test", { to: testEmailTo }); },
    onSuccess: () => toast.success("Email de prueba enviado correctamente"),
    onError: (err: any) => toast.error(err.response?.data?.detail || "No se pudo enviar"),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="border-b pb-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Recordatorios por Email</h2>
        </div>
        <p className="text-muted-foreground text-sm">Configurá el servidor SMTP para enviar recordatorios automáticos 24hs antes del turno.</p>
      </header>

      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold">Activar recordatorios automáticos</label>
            <button onClick={() => setEmailForm(f => ({ ...f, enabled: !f.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailForm.enabled ? "bg-primary" : "bg-muted"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${emailForm.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Selector de proveedor */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Proveedor de email</label>
            <div className="flex gap-2">
              {[
                { label: "Gmail", host: "smtp.gmail.com", port: 587 },
                { label: "Outlook / Hotmail", host: "smtp-mail.outlook.com", port: 587 },
                { label: "Yahoo", host: "smtp.mail.yahoo.com", port: 587 },
                { label: "Personalizado", host: "", port: 587 },
              ].map(p => (
                <button key={p.label} type="button"
                  onClick={() => p.host && setEmailForm(f => ({ ...f, smtp_host: p.host, smtp_port: p.port }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${emailForm.smtp_host === p.host && p.host ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:bg-accent"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Servidor SMTP", key: "smtp_host", placeholder: "smtp.gmail.com" },
              { label: "Puerto", key: "smtp_port", placeholder: "587", type: "number" },
              { label: "Email remitente", key: "smtp_user", placeholder: "tu@proveedor.com" },
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
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                Contraseña / App Password
                {emailForm.smtp_password === MASKED_PASSWORD && (
                  <span className="text-[10px] font-normal text-green-600 dark:text-green-400">✓ Guardada — tocá para cambiarla</span>
                )}
              </label>
              <div className="relative">
                <input type={showEmailPass ? "text" : "password"} value={emailForm.smtp_password} placeholder="••••••••••••"
                  onFocus={() => { if (emailForm.smtp_password === MASKED_PASSWORD) setEmailForm(prev => ({ ...prev, smtp_password: "" })); }}
                  onChange={e => setEmailForm(prev => ({ ...prev, smtp_password: e.target.value }))}
                  className="w-full border border-input bg-background px-3 py-2 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={() => setShowEmailPass(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showEmailPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Gmail: usá una <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary underline">App Password</a> ·
                Outlook/Hotmail: tu contraseña normal (con verificación en 2 pasos puede requerir contraseña de app)
              </p>
            </div>
          </div>

          <div className="pt-2 border-t space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" /> WhatsApp para confirmar/cancelar turnos
            </label>
            <input type="tel" value={emailForm.whatsapp_number}
              placeholder="Ej: 5492611234567"
              onChange={e => setEmailForm(prev => ({ ...prev, whatsapp_number: e.target.value }))}
              className="w-full sm:w-64 border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <p className="text-[10px] text-muted-foreground">
              Con código de país, sin espacios ni "+" (ej: 54 9 261 123 4567 → 5492611234567). Los botones "Confirmar turno" / "Cancelar turno" del mail de recordatorio le abren WhatsApp al paciente directo a este número, con el mensaje ya escrito. Si lo dejás vacío, esos botones no aparecen.
            </p>
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
