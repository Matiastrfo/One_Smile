import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { CalendarDays, Users, Menu, X, LogOut, ShieldAlert, Package, CreditCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
        `}
      >
        <div className="p-6 border-b flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            DentalManager<span className="text-blue-500">Pro</span>
          </h1>
          <button 
            className="md:hidden p-1 text-muted-foreground hover:bg-muted rounded-md"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <link.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t">
          <button
            onClick={logout}
            className="flex items-center w-full gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
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
            DentalManager<span className="text-blue-500">Pro</span>
          </div>
          
          {/* Contenido derecho del header */}
          <div className="ml-auto hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <span className="px-2 py-1 bg-muted rounded-md text-xs font-semibold uppercase tracking-wider">{user?.role}</span>
            {user?.email}
          </div>
        </header>

        {/* Contenido de la página */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
        
      </main>
    </div>
  );
}
