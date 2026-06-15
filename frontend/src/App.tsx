import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MainLayout } from "./layouts/MainLayout";
import { AppointmentsPage } from "./pages/Appointments/AppointmentsPage";
import { PatientsPage } from "./pages/Patients/PatientsPage";
import { PatientProfilePage } from "./pages/Patients/PatientProfilePage";
import { LoginPage } from "./pages/Login/LoginPage";
import { AdminDashboard } from "./pages/Admin/Dashboard";
import { BoxesPage } from "./pages/Boxes/BoxesPage";
import { PaymentsPage } from "./pages/Payments/PaymentsPage";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./layouts/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route index element={<Navigate to="/appointments" replace />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="patients" element={<PatientsPage />} />
                <Route path="patients/:id" element={<PatientProfilePage />} />
                
                {/* Admin Only Route */}
                <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                  <Route path="admin" element={<AdminDashboard />} />
                  <Route path="boxes" element={<BoxesPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                </Route>
              </Route>
            </Route>
            
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
