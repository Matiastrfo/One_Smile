import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, X, Clock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getAppointments } from "../api/appointmentApi";
import { getPatients } from "../api/patientApi";

export function TodayBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: getAppointments,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => getPatients(),
  });

  const today = new Date();
  const todayAppts = appointments
    .filter(a => {
      const [y, m, d] = a.date_time.split(" ")[0].split("-").map(Number);
      return y === today.getFullYear() && m - 1 === today.getMonth() && d === today.getDate();
    })
    .sort((a, b) => a.date_time.localeCompare(b.date_time));

  if (dismissed || todayAppts.length === 0) return null;

  const getPatientName = (id: number) => {
    const p = patients.find(p => p.id === id);
    return p ? p.name : `Paciente #${id}`;
  };

  const pending = todayAppts.filter(a => a.status === "PENDING");

  return (
    <div className="mx-4 mt-3 md:mx-8 md:mt-4 bg-primary/5 border border-primary/20 rounded-2xl overflow-hidden shadow-sm">
      {/* Header del banner */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-primary/15">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary text-primary-foreground shrink-0">
            <Bell className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {todayAppts.length === 1
                ? "Tenés 1 turno hoy"
                : `Tenés ${todayAppts.length} turnos hoy`}
            </p>
            {pending.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {pending.length} pendiente{pending.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/appointments"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            Ver agenda <ChevronRight className="h-3 w-3" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-muted-foreground hover:bg-primary/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Lista de turnos */}
      <div className="flex flex-wrap gap-2 px-4 py-3">
        {todayAppts.map(appt => {
          const time = appt.date_time.split(" ")[1] ?? "";
          const isPending = appt.status === "PENDING";
          return (
            <div
              key={appt.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border
                ${isPending
                  ? "bg-background border-border text-foreground"
                  : "bg-muted border-border/50 text-muted-foreground line-through"
                }`}
            >
              <Clock className="h-3 w-3 shrink-0 text-primary" />
              <span className="font-bold text-primary">{time}</span>
              <span>{getPatientName(appt.patient_id)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
