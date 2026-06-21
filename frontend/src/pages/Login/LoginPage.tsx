import React, { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

const SAVED_USERS_KEY = "onesmile_saved_users";

function getSavedUsers(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_USERS_KEY) || "[]"); } catch { return []; }
}

function saveUser(username: string) {
  const users = getSavedUsers().filter(u => u.toLowerCase() !== username.toLowerCase());
  users.unshift(username);
  localStorage.setItem(SAVED_USERS_KEY, JSON.stringify(users.slice(0, 5)));
}

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savedUsers, setSavedUsers] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { setSavedUsers(getSavedUsers()); }, []);

  const filtered = savedUsers.filter(u =>
    u.toLowerCase().includes(username.toLowerCase()) && u.toLowerCase() !== username.toLowerCase()
  );

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/auth/login", { username, password });
      return data;
    },
    onSuccess: (data) => {
      saveUser(username);
      login(data.access_token, { id: data.id ?? 0, email: data.email ?? "", role: data.role, name: data.name ?? "" });
      navigate("/");
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        setErrorMsg(detail.map((d: any) => d.msg || JSON.stringify(d)).join(", "));
      } else {
        setErrorMsg(typeof detail === "string" ? detail : "Error al iniciar sesión");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setShowSuggestions(false);
    loginMutation.mutate();
  };

  const selectUser = (u: string) => {
    setUsername(u);
    setShowSuggestions(false);
    setTimeout(() => document.getElementById("password-input")?.focus(), 50);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4 selection:bg-primary/20">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-10">
          <img src={logo} alt="OneSmile" className="h-56 w-auto mb-2 object-contain" />
          <p className="text-muted-foreground mt-2 font-medium">Ingresá tus credenciales para continuar</p>
        </div>

        <div className="bg-card shadow-sm border border-border/60 rounded-3xl p-8 relative overflow-visible">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-primary rounded-t-3xl" />

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            {errorMsg && (
              <div className="bg-rose-100 border border-rose-300 text-rose-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-muted-foreground ml-1">Usuario</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  name="username"
                  autoComplete="off"
                  required
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm font-medium text-foreground placeholder:text-muted-foreground"
                  placeholder="Tu nombre o email"
                />
                {showSuggestions && filtered.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                    {filtered.map(u => (
                      <button
                        key={u}
                        type="button"
                        onMouseDown={() => selectUser(u)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors"
                      >
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{u}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-muted-foreground ml-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="off"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm font-medium text-foreground placeholder:text-muted-foreground"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8 font-medium">
          Acceso exclusivo para personal autorizado.
        </p>
      </div>
    </div>
  );
}
