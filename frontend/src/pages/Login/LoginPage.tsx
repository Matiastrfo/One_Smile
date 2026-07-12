import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Lock, User, AlertCircle, Eye, EyeOff, ShieldCheck, KeyRound, Copy, CheckCheck } from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import logoDark from "../../assets/logo-dark.png";

const SAVED_USERS_KEY = "onesmile_saved_users";
function getSavedUsers(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_USERS_KEY) || "[]"); } catch { return []; }
}
function saveUser(username: string) {
  const users = getSavedUsers().filter(u => u.toLowerCase() !== username.toLowerCase());
  users.unshift(username);
  localStorage.setItem(SAVED_USERS_KEY, JSON.stringify(users.slice(0, 5)));
}

type Screen = "login" | "setup" | "recover";

export function LoginPage() {
  const [screen, setScreen] = useState<Screen>("login");
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Check if first-time setup needed
  const { data: setupData, isLoading: checkingSetup } = useQuery({
    queryKey: ["needs-setup"],
    queryFn: async () => { const { data } = await api.get("/api/auth/needs-setup"); return data; },
    retry: false,
  });

  useEffect(() => {
    if (setupData?.needs_setup) setScreen("setup");
  }, [setupData]);

  const onLoginSuccess = (data: any, username: string) => {
    saveUser(username);
    login(data.access_token, { id: data.id ?? 0, email: data.email ?? "", role: data.role, name: data.name ?? "" });
    navigate("/");
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4 selection:bg-primary/20">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-10">
          <img src={theme === "dark" ? logoDark : logo} alt="OneSmile" className="h-56 w-auto mb-2 object-contain" />
          {screen === "setup" && <p className="text-muted-foreground mt-2 font-medium text-center">Primera vez aquí — creá tu cuenta de administrador</p>}
          {screen === "login" && <p className="text-muted-foreground mt-2 font-medium">Ingresá tus credenciales para continuar</p>}
          {screen === "recover" && <p className="text-muted-foreground mt-2 font-medium">Recuperar contraseña</p>}
        </div>

        {screen === "login" && (
          <LoginForm onSuccess={onLoginSuccess} onRecover={() => setScreen("recover")} />
        )}
        {screen === "setup" && (
          <SetupForm onSuccess={onLoginSuccess} />
        )}
        {screen === "recover" && (
          <RecoverForm onBack={() => setScreen("login")} />
        )}

        <p className="text-center text-sm text-muted-foreground mt-8 font-medium">
          Acceso exclusivo para personal autorizado.
        </p>
      </div>
    </div>
  );
}

// ── Login ────────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onRecover }: { onSuccess: (data: any, username: string) => void; onRecover: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savedUsers, setSavedUsers] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSavedUsers(getSavedUsers()); }, []);

  const filtered = savedUsers.filter(u =>
    u.toLowerCase().includes(username.toLowerCase()) && u.toLowerCase() !== username.toLowerCase()
  );

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/auth/login", { username, password });
      return data;
    },
    onSuccess: (data) => onSuccess(data, username),
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      setErrorMsg(Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ") : typeof detail === "string" ? detail : "Error al iniciar sesión");
    }
  });

  return (
    <div className="bg-card shadow-sm border border-border/60 rounded-3xl p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-primary" />
      <form onSubmit={e => { e.preventDefault(); setErrorMsg(""); setShowSuggestions(false); loginMutation.mutate(); }} className="space-y-6" autoComplete="off">
        {errorMsg && (
          <div className="bg-rose-100 border border-rose-300 text-rose-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" /><p>{errorMsg}</p>
          </div>
        )}
        <div className="space-y-2 relative">
          <label className="text-sm font-semibold text-muted-foreground ml-1">Usuario</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <User className="h-5 w-5" />
            </div>
            <input ref={inputRef} type="text" name="username" autoComplete="off" required value={username}
              onChange={e => { setUsername(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm font-medium text-foreground placeholder:text-muted-foreground"
              placeholder="Tu nombre o email" />
            {showSuggestions && filtered.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                {filtered.map(u => (
                  <button key={u} type="button" onMouseDown={() => { setUsername(u); setShowSuggestions(false); setTimeout(() => document.getElementById("password-input")?.focus(), 50); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{u}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground ml-1">Contraseña</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Lock className="h-5 w-5" />
            </div>
            <input id="password-input" type={showPassword ? "text" : "password"} name="password" autoComplete="off" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm font-medium text-foreground placeholder:text-muted-foreground"
              placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-primary transition-colors focus:outline-none">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loginMutation.isPending}
          className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-sm text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all active:scale-[0.98]">
          {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
        <button type="button" onClick={onRecover} className="w-full text-center text-sm text-primary hover:underline font-medium">
          Olvidé mi contraseña
        </button>
      </form>
    </div>
  );
}

// ── Setup inicial ────────────────────────────────────────────────────────────

function SetupForm({ onSuccess }: { onSuccess: (data: any, username: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const setupMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/auth/setup", { name, email, password });
      return data;
    },
    onSuccess: (data) => setRecoveryCode(data.recovery_code),
    onError: (err: any) => {
      const d = err.response?.data?.detail;
      setErrorMsg(typeof d === "string" ? d : Array.isArray(d) ? d.map((x: any) => x.msg).join(", ") : "Error al crear la cuenta");
    }
  });

  const copyCode = () => {
    if (recoveryCode) {
      navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (recoveryCode) {
    return (
      <div className="bg-card shadow-sm border border-border/60 rounded-3xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-500" />
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-lg font-bold">¡Cuenta creada!</h3>
          <p className="text-sm text-muted-foreground">Este es tu <strong>código de recuperación</strong>. Guardalo en un lugar seguro — es la única forma de recuperar el acceso si olvidás tu contraseña.</p>
          <div className="w-full bg-muted/50 border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
            <span className="font-mono text-lg font-bold tracking-widest text-foreground">{recoveryCode}</span>
            <button onClick={copyCode} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              {copied ? <CheckCheck className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <div className="w-full flex items-center gap-3 bg-rose-600 text-white px-4 py-3 rounded-xl font-bold text-sm">
            <span className="text-lg shrink-0">⚠️</span>
            <span>Este código no se volverá a mostrar. Anotalo antes de continuar.</span>
          </div>
          <button onClick={() => setupMutation.data && onSuccess(setupMutation.data, email)}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all active:scale-[0.98]">
            Entrar al sistema
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card shadow-sm border border-border/60 rounded-3xl overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-500" />
      <form onSubmit={e => { e.preventDefault(); setErrorMsg(""); setupMutation.mutate(); }} className="p-8 space-y-5">
        {errorMsg && (
          <div className="bg-rose-100 border border-rose-300 text-rose-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" /><p>{errorMsg}</p>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-muted-foreground">Nombre completo</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
            placeholder="Dr. Juan García" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-muted-foreground">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
            placeholder="tu@email.com" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-muted-foreground">Contraseña</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} required minLength={4} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full pr-12 px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
              placeholder="Mínimo 4 caracteres" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-primary transition-colors">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={setupMutation.isPending}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98]">
          {setupMutation.isPending ? "Creando cuenta..." : "Crear mi cuenta"}
        </button>
      </form>
    </div>
  );
}

// ── Recuperar contraseña ─────────────────────────────────────────────────────

function RecoverForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const recoverMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/auth/recover", { email, recovery_code: code.replace(/-/g, ""), new_password: newPassword });
    },
    onSuccess: () => setSuccess(true),
    onError: (err: any) => {
      const d = err.response?.data?.detail;
      setErrorMsg(typeof d === "string" ? d : "Código incorrecto o email no encontrado");
    }
  });

  if (success) {
    return (
      <div className="bg-card shadow-sm border border-border/60 rounded-3xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto">
          <ShieldCheck className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="font-bold text-lg">Contraseña actualizada</h3>
        <p className="text-sm text-muted-foreground">Ya podés iniciar sesión con tu nueva contraseña.</p>
        <button onClick={onBack} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all">
          Volver al login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card shadow-sm border border-border/60 rounded-3xl p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-primary" />
      <form onSubmit={e => { e.preventDefault(); setErrorMsg(""); recoverMutation.mutate(); }} className="space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Recuperar contraseña</h3>
        </div>
        {errorMsg && (
          <div className="bg-rose-100 border border-rose-300 text-rose-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" /><p>{errorMsg}</p>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-muted-foreground">Email de tu cuenta</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
            placeholder="tu@email.com" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-muted-foreground">Código de recuperación</label>
          <input type="text" required value={code} onChange={e => setCode(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono font-bold tracking-widest uppercase"
            placeholder="XXXX-XXXX-XXXX-XXXX" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-muted-foreground">Nueva contraseña</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} required minLength={4} value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full pr-12 px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
              placeholder="Mínimo 4 caracteres" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-primary transition-colors">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={recoverMutation.isPending}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98]">
          {recoverMutation.isPending ? "Verificando..." : "Cambiar contraseña"}
        </button>
        <button type="button" onClick={onBack} className="w-full text-center text-sm text-muted-foreground hover:text-foreground font-medium">
          ← Volver al login
        </button>
      </form>
    </div>
  );
}
