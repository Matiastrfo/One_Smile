import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon } from "lucide-react";
import { getAppointments, deleteAppointment, updateAppointmentStatus, quickCreateAppointment, createAppointment } from "../../api/appointmentApi";
import { getPatients } from "../../api/patientApi";
import { MonthCalendar } from "./components/MonthCalendar";
import { DayPanel } from "./components/DayPanel";
import { QuickAppointmentModal } from "./components/QuickAppointmentModal";

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showQuickModal, setShowQuickModal] = useState(false);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: getAppointments,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => getPatients(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
  };

  const quickMutation = useMutation({
    mutationFn: quickCreateAppointment,
    onSuccess: () => { invalidate(); setShowQuickModal(false); },
    onError: (error: any) => alert(error.response?.data?.detail || "Error al agendar"),
  });

  const existingMutation = useMutation({
    mutationFn: (body: { patient_id: number; date_time: string; reason: string }) =>
      createAppointment({ patient_id: body.patient_id, date_time: body.date_time, reason: body.reason } as any),
    onSuccess: () => { invalidate(); setShowQuickModal(false); },
    onError: (error: any) => alert(error.response?.data?.detail || "Error al agendar"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: invalidate,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateAppointmentStatus(id, status),
    onSuccess: invalidate,
    onError: () => alert("Error al actualizar el estado"),
  });

  const getPatientName = (id: number) => {
    const p = patients.find(p => p.id === id);
    return p ? p.name : `Paciente #${id}`;
  };

  const handleDelete = (id: number) => {
    if (window.confirm("¿Cancelar este turno?")) deleteMutation.mutate(id);
  };

  // Turnos del día seleccionado
  const apptsBySelectedDay = selectedDate
    ? appointments.filter(a => {
        const [y, m, d] = a.date_time.split(" ")[0].split("-").map(Number);
        return y === selectedDate.getFullYear() && m - 1 === selectedDate.getMonth() && d === selectedDate.getDate();
      })
    : [];

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <header className="flex items-center gap-4 border-b pb-4">
        <div className="hidden sm:flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Agenda de Turnos</h2>
          <p className="text-muted-foreground mt-1 text-sm">Gestioná las citas programadas de los pacientes.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <p className="text-muted-foreground animate-pulse">Cargando...</p>
        </div>
      ) : (
        <div className="animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <MonthCalendar
              appointments={appointments}
              getPatientName={getPatientName}
              selectedDate={selectedDate}
              onDayClick={setSelectedDate}
            />

            {selectedDate ? (
              <DayPanel
                date={selectedDate}
                appointments={apptsBySelectedDay}
                getPatientName={getPatientName}
                onAdd={() => setShowQuickModal(true)}
                onDelete={handleDelete}
                onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              />
            ) : (
              <div className="hidden lg:flex flex-col items-center justify-center bg-card border border-border/60 rounded-2xl text-muted-foreground p-8 text-center">
                <CalendarIcon className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">Seleccioná un día<br/>para ver sus turnos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showQuickModal && selectedDate && (
        <QuickAppointmentModal
          date={selectedDate}
          patients={patients}
          onClose={() => setShowQuickModal(false)}
          onSubmitNew={quickMutation.mutate}
          onSubmitExisting={existingMutation.mutate}
          isPending={quickMutation.isPending || existingMutation.isPending}
        />
      )}
    </main>
  );
}
