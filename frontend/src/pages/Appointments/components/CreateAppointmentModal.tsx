import { useState } from "react";
import { X } from "lucide-react";
import type { Patient } from "../../../types";

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { patient_id: number; date_time: string; reason: string }) => void;
  patients: Patient[];
  isPending: boolean;
}

export function CreateAppointmentModal({ isOpen, onClose, onSubmit, patients, isPending }: CreateAppointmentModalProps) {
  const [formData, setFormData] = useState({ 
    patient_id: "", 
    date: "", 
    time: "", 
    reason: "" 
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.date || !formData.time) {
      alert("Por favor completa los campos obligatorios");
      return;
    }
    
    const dateTime = `${formData.date} ${formData.time}`;
    onSubmit({
      patient_id: parseInt(formData.patient_id),
      date_time: dateTime,
      reason: formData.reason
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-background border border-border rounded-lg shadow-xl w-[95%] sm:max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
        <header className="flex justify-between items-center p-4 border-b sticky top-0 bg-background z-10 shrink-0">
          <h3 id="modal-title" className="font-semibold text-lg text-foreground">Agendar Nuevo Turno</h3>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-4 space-y-5 flex-grow">
          <div className="space-y-2">
            <label htmlFor="patient_id" className="text-sm font-medium text-foreground">Paciente</label>
            <select 
              id="patient_id"
              required
              value={formData.patient_id}
              onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              className="w-full border border-input bg-background text-foreground px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
            >
              <option value="" disabled>Seleccione un paciente</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} (DNI: {p.dni})</option>
              ))}
            </select>
            {patients.length === 0 && (
              <p className="text-xs text-red-500 font-medium mt-1">No hay pacientes registrados. Ve a Gestión de Pacientes primero.</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium text-foreground">Fecha</label>
              <input 
                id="date"
                required
                type="date" 
                min={new Date().toISOString().split("T")[0]}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full border border-input bg-background text-foreground px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="time" className="text-sm font-medium text-foreground">Hora</label>
              <input 
                id="time"
                required
                type="time" 
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full border border-input bg-background text-foreground px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium text-foreground">Motivo (Opcional)</label>
            <textarea 
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full border border-input bg-background text-foreground px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-24 resize-none transition-shadow"
              placeholder="Detalles de la consulta..."
            />
          </div>

          <footer className="pt-4 mt-2 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-2 shrink-0">
            <button 
              type="button" 
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-input bg-background rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isPending || patients.length === 0}
              className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50 transition-colors flex justify-center items-center"
            >
              {isPending ? "Agendando..." : "Agendar Turno"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
