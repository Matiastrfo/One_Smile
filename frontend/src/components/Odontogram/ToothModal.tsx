import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getToothTreatments, recordToothTreatment } from '../../api/patientApi';
import type { DentalPieceCondition, Treatment, ToothTreatmentCreate } from '../../types';

interface ToothModalProps {
  patientId: number;
  toothNumber: number;
  currentCondition: DentalPieceCondition;
  onClose: () => void;
}

const conditions: { value: DentalPieceCondition; label: string }[] = [
  { value: 'HEALTHY', label: 'Sano' },
  { value: 'CARIES', label: 'Caries' },
  { value: 'FILLED', label: 'Arreglado (Empaste)' },
  { value: 'CROWN', label: 'Corona' },
  { value: 'IMPLANT', label: 'Implante' },
  { value: 'EXTRACTED', label: 'Extraído' },
];

const ToothModal: React.FC<ToothModalProps> = ({ patientId, toothNumber, currentCondition, onClose }) => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  
  const [formData, setFormData] = useState<ToothTreatmentCreate>({
    condition: currentCondition,
    description: '',
    price: 0,
  });

  const { data: treatments, isLoading } = useQuery<Treatment[]>({
    queryKey: ['toothTreatments', patientId, toothNumber],
    queryFn: () => getToothTreatments(patientId, toothNumber),
  });

  const mutation = useMutation({
    mutationFn: (data: ToothTreatmentCreate) => recordToothTreatment(patientId, toothNumber, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odontogram', patientId] });
      queryClient.invalidateQueries({ queryKey: ['toothTreatments', patientId, toothNumber] });
      onClose();
    },
    onError: (error: any) => {
      alert("Error al registrar tratamiento: " + (error.response?.data?.detail || error.message));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const sortedTreatments = treatments 
    ? [...treatments].sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime()) 
    : [];
  const totalPages = Math.ceil(sortedTreatments.length / itemsPerPage);
  const paginatedTreatments = sortedTreatments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Pieza Dental {toothNumber}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 overflow-y-auto">
          {/* Columna Izquierda: Formulario */}
          <div className="space-y-4">
            <h4 className="font-semibold border-b pb-2">Registrar Nuevo Tratamiento / Estado</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Estado / Condición</label>
                <select 
                  value={formData.condition} 
                  onChange={e => setFormData({...formData, condition: e.target.value as DentalPieceCondition})}
                  className="w-full border rounded-md px-3 py-2 bg-transparent"
                >
                  {conditions.map(c => (
                    <option key={c.value} value={c.value} className="bg-background">{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción (Opcional)</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full border rounded-md px-3 py-2 bg-transparent h-24 resize-none" 
                  placeholder="Detalle del procedimiento..."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Costo ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={formData.price || ''} 
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  className="w-full border rounded-md px-3 py-2 bg-transparent" 
                />
              </div>
              <button 
                type="submit" 
                disabled={mutation.isPending} 
                className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
              >
                Guardar
              </button>
            </form>
          </div>

          {/* Columna Derecha: Historial */}
          <div className="space-y-4">
            <h4 className="font-semibold border-b pb-2">Historial de la Pieza</h4>
            {isLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Cargando...</p>
            ) : sortedTreatments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No hay tratamientos registrados en esta pieza.</p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                  {paginatedTreatments.map(t => (
                    <div key={t.id} className="p-3 border rounded-lg bg-muted/20 text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold">{new Date(t.date_time).toLocaleString()}</span>
                        {t.price > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">${t.price}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">Por: {t.professional_email}</p>
                      <p>{t.description}</p>
                    </div>
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-2 border-t mt-4">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToothModal;
