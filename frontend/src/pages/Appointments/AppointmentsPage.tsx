import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Settings } from "lucide-react";
import { getAppointments, deleteAppointment, updateAppointmentStatus, createAppointment, quickCreateAppointment } from "../../api/appointmentApi";
import { getPatients } from "../../api/patientApi";
import { getScheduleConfig, saveScheduleConfig } from "../../api/scheduleConfigApi";
import { MonthCalendar } from "./components/MonthCalendar";
import { DayPanel } from "./components/DayPanel";
import { QuickAppointmentModal } from "./components/QuickAppointmentModal";
import { ScheduleConfigModal } from "./components/ScheduleConfigModal";
import { SlotPickerModal } from "./components/SlotPickerModal";

const DAY_MAP: Record<number, string> = {
  0: "SUNDAY", 1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY",
  4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
};

export function AppointmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [preselectedPatientId, setPreselectedPatientId] = useState<number | null>(
    (location.state as any)?.preselectedPatientId ?? null
  );

  useEffect(() => {
    if (preselectedPatientId !== null) {
      setShowQuickModal(true);
      window.history.replaceState({}, '');
    }
  }, []);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: getAppointments,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => getPatients(),
  });

  const { data: scheduleConfig } = useQuery({
    queryKey: ["scheduleConfig"],
    queryFn: getScheduleConfig,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
  };

  const appointmentMutation = useMutation({
    mutationFn: (body: { patient_id: number; date_time: string; reason: string }) =>
      createAppointment({ patient_id: body.patient_id, date_time: body.date_time, reason: body.reason } as any),
    onSuccess: () => { invalidate(); setShowQuickModal(false); },
    onError: (error: any) => alert(error.response?.data?.detail || "Error al agendar"),
  });

  const quickMutation = useMutation({
    mutationFn: quickCreateAppointment,
    onSuccess: () => { invalidate(); setShowQuickModal(false); },
    onError: (error: any) => alert(error.response?.data?.detail || "Error al agendar"),
  });

  const configMutation = useMutation({
    mutationFn: saveScheduleConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleConfig"] });
      setShowConfigModal(false);
    },
    onError: () => alert("Error al guardar la configuración"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: invalidate,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) => updateAppointmentStatus(id, status, notes),
    onSuccess: invalidate,
    onError: () => alert("Error al actualizar el estado"),
  });

  const getPatientName = (id: number) => {
    const p = patients.find(p => p.id === id);
    return p ? p.name : `Paciente #${id}`;
  };

  const getPatientEmail = (id: number) => {
    const p = patients.find(p => p.id === id) as any;
    return p?.email ?? "";
  };

  const handleDelete = (id: number) => {
    if (window.confirm("¿Cancelar este turno?")) deleteMutation.mutate(id);
  };

  const apptsBySelectedDay = selectedDate
    ? appointments.filter(a => {
        const [y, m, d] = a.date_time.split(" ")[0].split("-").map(Number);
        return y === selectedDate.getFullYear() && m - 1 === selectedDate.getMonth() && d === selectedDate.getDate();
      })
    : [];

  // Determina si el día seleccionado tiene una grilla configurada
  const selectedDayKey = selectedDate ? DAY_MAP[selectedDate.getDay()] : null;
  const selectedDaySchedule = scheduleConfig?.days.find(d => d.day_of_week === selectedDayKey && d.enabled);
  const useSlotPicker = !!selectedDaySchedule;

  const handleAddClick = () => setShowQuickModal(true);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <header className="flex items-center gap-4 border-b pb-4">
        <div className="hidden sm:flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Agenda de Turnos</h2>
          <p className="text-muted-foreground mt-1 text-sm">Gestioná las citas programadas de los pacientes.</p>
        </div>
        <button
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted transition-colors text-sm font-medium"
          title="Configurar horarios"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Configurar horarios</span>
        </button>
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
                getPatientEmail={getPatientEmail}
                professionalName={user?.name || user?.email}
                onAdd={handleAddClick}
                onDelete={handleDelete}
                onStatusChange={(id, status, notes) => statusMutation.mutate({ id, status, notes })}
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

      {/* Modal grilla de slots (cuando el día tiene horarios configurados) */}
      {showQuickModal && selectedDate && useSlotPicker && (
        <SlotPickerModal
          date={selectedDate}
          daySchedule={selectedDaySchedule!}
          patients={patients}
          appointments={apptsBySelectedDay}
          allAppointments={appointments}
          scheduleConfig={scheduleConfig}
          preselectedPatientId={preselectedPatientId}
          onClose={() => { setShowQuickModal(false); setPreselectedPatientId(null); }}
          onDateChange={setSelectedDate}
          onSubmit={appointmentMutation.mutate}
          onSubmitNew={quickMutation.mutate}
          isPending={appointmentMutation.isPending || quickMutation.isPending}
        />
      )}

      {/* Modal libre (cuando el día NO tiene horarios configurados) */}
      {showQuickModal && selectedDate && !useSlotPicker && (
        <QuickAppointmentModal
          date={selectedDate}
          patients={patients}
          preselectedPatientId={preselectedPatientId}
          onClose={() => { setShowQuickModal(false); setPreselectedPatientId(null); }}
          onSubmitNew={quickMutation.mutate}
          onSubmitExisting={appointmentMutation.mutate}
          isPending={appointmentMutation.isPending}
        />
      )}

      {/* Modal configuración de horarios */}
      {showConfigModal && (
        <ScheduleConfigModal
          config={scheduleConfig ?? { days: [] }}
          onClose={() => setShowConfigModal(false)}
          onSave={configMutation.mutate}
          isPending={configMutation.isPending}
        />
      )}
    </main>
  );
}
