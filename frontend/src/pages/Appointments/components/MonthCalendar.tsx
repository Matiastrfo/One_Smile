import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "../../../types";

interface MonthCalendarProps {
  appointments: Appointment[];
  getPatientName: (id: number) => string;
  selectedDate: Date | null;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-400",
  ATTENDED: "bg-emerald-500",
  ABSENT: "bg-rose-500",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function MonthCalendar({ appointments, getPatientName, selectedDate, onDayClick }: MonthCalendarProps) {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const prev = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 });
  const next = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 });

  const daysInMonth = getDaysInMonth(current.year, current.month);
  const firstWeekday = getFirstWeekday(current.year, current.month);

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const apptsByDay = appointments.reduce((acc, appt) => {
    const datePart = appt.date_time.split(" ")[0];
    if (!datePart) return acc;
    const [y, m, d] = datePart.split("-").map(Number);
    if (y === current.year && m - 1 === current.month) {
      if (!acc[d]) acc[d] = [];
      acc[d].push(appt);
    }
    return acc;
  }, {} as Record<number, Appointment[]>);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-bold text-foreground text-lg">
          {MONTHS[current.month]} {current.year}
        </h3>
        <button onClick={next} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="divide-y divide-border/40">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-border/40">
            {week.map((day, di) => {
              const cellDate = day ? new Date(current.year, current.month, day) : null;
              const isToday = cellDate ? isSameDay(cellDate, today) : false;
              const isSelected = cellDate && selectedDate ? isSameDay(cellDate, selectedDate) : false;
              const dayAppts = day ? (apptsByDay[day] || []) : [];

              return (
                <div
                  key={di}
                  onClick={() => { if (day && cellDate) onDayClick(cellDate); }}
                  className={`min-h-[96px] p-2 flex flex-col gap-1 transition-colors
                    ${day ? "cursor-pointer hover:bg-primary/5" : "bg-muted/10"}
                    ${isSelected ? "bg-primary/10 ring-2 ring-inset ring-primary/40" : ""}
                  `}
                >
                  {day && (
                    <>
                      <span className={`text-sm font-semibold self-start leading-none w-7 h-7 flex items-center justify-center rounded-full transition-colors
                        ${isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/20 text-primary" : "text-foreground"}`}>
                        {day}
                      </span>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {dayAppts.slice(0, 3).map(appt => (
                          <div
                            key={appt.id}
                            title={`${getPatientName(appt.patient_id)} — ${appt.date_time.split(" ")[1] ?? ""}`}
                            className={`text-[10px] font-medium text-white px-1.5 py-0.5 rounded truncate ${STATUS_COLORS[appt.status ?? "PENDING"]}`}
                          >
                            {appt.date_time.split(" ")[1] ?? ""} {getPatientName(appt.patient_id)}
                          </div>
                        ))}
                        {dayAppts.length > 3 && (
                          <span className="text-[10px] text-muted-foreground pl-1">+{dayAppts.length - 3} más</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
