import { useState, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { CalendarDays, Users, Menu, X, LogOut, ShieldAlert, Package, CreditCard, Camera, Pencil, Check, Wallet, BarChart2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, uploadAvatar, updateMyName } from "../api/profileApi";
import logoSidebar from "../assets/logo-sidebar.png.png";
import { TodayBanner } from "../components/TodayBanner";

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const location = useLocation();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
  });

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myProfile"] }),
    onError: () => alert("Error al subir la foto"),
  });

  const nameMutation = useMutation({
    mutationFn: updateMyName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      setEditingName(false);
    },
    onError: () => alert("Error al actualizar el nombre"),
  });

  const handleNameEdit = () => {
    setNameInput(profile?.name || "");
    setEditingName(true);
  };

  const handleNameSave = () => {
    if (nameInput.trim()) nameMutation.mutate(nameInput.trim());
  };

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const avatarUrl = profile?.avatar_path
    ? `${API_BASE}${profile.avatar_path}`
    : null;

  const navLinks = [
    { to: "/appointments", icon: CalendarDays, label: "Agenda / Turnos" },
    { to: "/patients", icon: Users, label: "Gestión de Pacientes" },
    { to: "/cuenta-corriente", icon: Wallet, label: "Cuenta Corriente" },
    { to: "/estadisticas", icon: BarChart2, label: "Estadísticas" },
  ];

  if (user?.role === "admin") {
    navLinks.push({ to: "/admin", icon: ShieldAlert, label: "Panel Admin" });
    navLinks.push({ to: "/boxes", icon: Package, label: "Boxes" });
    navLinks.push({ to: "/payments", icon: CreditCard, label: "Pagos" });
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      
      {/* Overlay para móviles */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Principal */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card text-foreground border-r flex flex-col transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
        `}
      >
        <div className="px-3 py-4 border-b flex justify-between items-center">
          <div className="flex-1 flex flex-col items-center gap-1">
            <img src={logoSidebar} alt="OneSmile" className="h-32 w-auto object-contain" />
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Odontología Trifiro</span>
          </div>
          <button
            className="md:hidden p-1 text-muted-foreground hover:bg-muted rounded-md"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Menú principal
          </p>
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsSidebarOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <span
                  className={`flex items-center justify-center h-8 w-8 rounded-lg transition-colors ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-accent text-primary group-hover:bg-white"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) avatarMutation.mutate(file);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-3 px-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative shrink-0 group"
              title="Cambiar foto de perfil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30" />
              ) : (
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-semibold uppercase">
                  {user?.email?.charAt(0) ?? "U"}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </button>
            <div className="min-w-0 flex-1">
              {editingName ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleNameSave(); if (e.key === "Escape") setEditingName(false); }}
                    className="flex-1 min-w-0 text-sm border border-primary rounded-md px-1.5 py-0.5 bg-background focus:outline-none"
                  />
                  <button onClick={handleNameSave} className="p-0.5 text-primary hover:text-primary/80">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 group/name">
                  <p className="text-sm font-medium truncate">{profile?.name || user?.email}</p>
                  <button onClick={handleNameEdit} className="opacity-0 group-hover/name:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium text-rose-500 hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        
        {/* Header superior */}
        <header className="h-14 border-b bg-background flex items-center px-4 shrink-0 shadow-sm">
          {/* Botón hamburguesa (Solo se ve en mobile) */}
          <button 
            className="p-2 -ml-2 mr-2 md:hidden text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="font-semibold text-foreground md:hidden">
            One<span className="text-accent-foreground">Smile</span>
          </div>
        </header>

        {/* Banner de turnos de hoy */}
        <TodayBanner />

        {/* Contenido de la página */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
        
      </main>
    </div>
  );
}
