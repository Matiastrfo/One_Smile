import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock, Mail, AlertCircle, Eye, EyeOff } from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/auth/login", { email, password });
      return data;
    },
    onSuccess: (data) => {
      login(data.access_token, { id: 0, email, role: data.role, name: data.name ?? "" });
      navigate("/");
    },
    onError: (error: any) => {
      setErrorMsg(error.response?.data?.detail || "Error al iniciar sesión");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4 selection:bg-primary/20">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="flex flex-col items-center justify-center mb-10">
          <img src={logo} alt="OneSmile" className="h-56 w-auto mb-2 object-contain" />
          <p className="text-muted-foreground mt-2 font-medium">Ingresá tus credenciales para continuar</p>
        </div>

        {/* Login Card */}
        <div className="bg-card shadow-sm border border-border/60 rounded-3xl p-8 relative overflow-hidden">
          {/* Decorative subtle top line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-primary" />

          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-muted-foreground ml-1">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm font-medium text-foreground placeholder:text-muted-foreground"
                  placeholder="admin@dentalmanager.com"
                />
              </div>
            </div>

            <div className="space-y-2 relative">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-muted-foreground">Contraseña</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
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
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
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

        {/* Footer info */}
        <p className="text-center text-sm text-muted-foreground mt-8 font-medium">
          Acceso exclusivo para personal autorizado.
        </p>
      </div>
    </div>
  );
}
