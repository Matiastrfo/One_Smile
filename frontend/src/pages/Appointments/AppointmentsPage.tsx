import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { getAppointments, createAppointment, deleteAppointment, updateAppointmentStatus } from "../../api/appointmentApi";
import { getPatients } from "../../api/patientApi";
import { AppointmentCard } from "./components/AppointmentCard";
import { CreateAppointmentModal } from "./components/CreateAppointmentModal";

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: getAppointments,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => getPatients(),
  });

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || "Error al agendar");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateAppointmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: () => {
      alert("Error al actualizar el estado");
    }
  });

  const handleDelete = (id: number) => {
    if (window.confirm("¿Cancelar este turno?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    statusMutation.mutate({ id, status: newStatus });
  };

  const getPatientName = (id: number) => {
    const p = patients.find(p => p.id === id);
    return p ? p.name : `Paciente #${id}`;
  };

  return (
    <main className="space-y-6 relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b pb-4 sm:border-0 sm:pb-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Agenda de Turnos</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Gestiona las citas programadas de los pacientes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 sm:py-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors w-full sm:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Abrir formulario para agendar nuevo turno"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Agendar Turno
        </button>
      </header>

      <section aria-label="Lista de turnos programados">
        {isLoadingAppointments ? (
          <div className="flex justify-center items-center py-20">
            <p className="text-muted-foreground animate-pulse font-medium">Cargando agenda...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {appointments.length === 0 ? (
              <div className="col-span-full border-2 border-dashed border-border rounded-xl h-64 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 p-6 text-center">
                <CalendarIcon className="h-12 w-12 mb-3 opacity-40 text-primary" />
                <p className="font-medium text-lg text-foreground/70">No hay turnos programados.</p>
                <p className="text-sm mt-1 max-w-md">Haz clic en "Agendar Turno" para registrar una nueva cita en el sistema.</p>
              </div>
            ) : (
              appointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id}
                  appointment={appointment}
                  patientName={getPatientName(appointment.patient_id)}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </div>
        )}
      </section>

      <CreateAppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={createMutation.mutate}
        patients={patients}
        isPending={createMutation.isPending}
      />
    </main>
  );
}
