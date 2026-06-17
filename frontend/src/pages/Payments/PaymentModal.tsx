import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { updatePayment } from "../../api/paymentApi";
import type { BoxPayment } from "../../types";

interface PaymentModalProps {
  payment: BoxPayment;
  onClose: () => void;
}

export function PaymentModal({ payment, onClose }: PaymentModalProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"PENDING" | "IN_PROGRESS" | "PAID">(payment.status);
  const [amount, setAmount] = useState<string>(payment.amount ? payment.amount.toString() : "");
  const [paymentDate, setPaymentDate] = useState<string>(payment.payment_date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>(payment.notes || "");

  const updateMutation = useMutation({
    mutationFn: (data: Partial<BoxPayment>) => updatePayment(payment.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      onClose();
    },
    onError: () => {
      alert("Error al actualizar el pago");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      status,
      amount: amount ? parseFloat(amount) : undefined,
      payment_date: paymentDate || undefined,
      notes: notes || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-lg border border-border/60 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg text-foreground">Actualizar Pago</h3>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 bg-muted/20 border-b">
          <p className="text-sm font-medium text-foreground">{payment.professional_email}</p>
          <p className="text-xs text-muted-foreground mt-1">Box: {payment.box_name} ({payment.shift === 'MORNING' ? 'Mañana' : 'Tarde'})</p>
          <p className="text-xs font-semibold text-primary mt-1">Mes: {payment.month_year}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="PENDING">Pendiente</option>
              <option value="IN_PROGRESS">Pago Parcial</option>
              <option value="PAID">Pagado</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Monto</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: 15000"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Fecha de Pago</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
              placeholder="Aclaraciones opcionales..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-input hover:bg-muted transition-colors text-foreground"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
