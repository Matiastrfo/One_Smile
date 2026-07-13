import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MainLayout } from "./layouts/MainLayout";
import { AppointmentsPage } from "./pages/Appointments/AppointmentsPage";
import { PatientsPage } from "./pages/Patients/PatientsPage";
import { PatientProfilePage } from "./pages/Patients/PatientProfilePage";
import { LoginPage } from "./pages/Login/LoginPage";
import { AdminDashboard } from "./pages/Admin/Dashboard";
import { BoxesPage } from "./pages/Boxes/BoxesPage";
import { PaymentsPage } from "./pages/Payments/PaymentsPage";
import { CuentaCorrientePage } from "./pages/CuentaCorriente/CuentaCorrientePage";
import { EstadisticasPage } from "./pages/Estadisticas/EstadisticasPage";
import { LabsPage } from "./pages/Labs/LabsPage";
import { BackupsPage } from "./pages/Backups/BackupsPage";
import { EmailRemindersPage } from "./pages/Reminders/EmailRemindersPage";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { ProtectedRoute } from "./layouts/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
    <ConfirmProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route index element={<Navigate to="/appointments" replace />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="patients" element={<PatientsPage />} />
                <Route path="patients/:id" element={<PatientProfilePage />} />
                <Route path="cuenta-corriente" element={<CuentaCorrientePage />} />
                <Route path="estadisticas" element={<EstadisticasPage />} />
                <Route path="laboratorio" element={<LabsPage />} />
                
                {/* Admin Only Route */}
                <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                  <Route path="admin" element={<AdminDashboard />} />
                  <Route path="boxes" element={<BoxesPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="backups" element={<BackupsPage />} />
                  <Route path="recordatorios" element={<EmailRemindersPage />} />
                </Route>
              </Route>
            </Route>
            
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
    </ConfirmProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
