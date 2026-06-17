import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { CalendarDays, Users, Menu, X, LogOut, ShieldAlert, Package, CreditCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import { TodayBanner } from "../components/TodayBanner";

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const navLinks = [
    { to: "/appointments", icon: CalendarDays, label: "Agenda / Turnos" },
    { to: "/patients", icon: Users, label: "Gestión de Pacientes" },
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
        <div className="p-4 border-b flex justify-between items-center">
          <img src={logo} alt="OneSmile" className="h-36 w-auto flex-1 object-contain" />
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
          <div className="flex items-center gap-3 px-1">
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground font-semibold uppercase shrink-0">
              {user?.email?.charAt(0) ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
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
