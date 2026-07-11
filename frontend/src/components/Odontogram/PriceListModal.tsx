import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, X } from "lucide-react";
import { getTreatmentPrices, saveTreatmentPrices } from "../../api/treatmentPriceApi";
import { TREATMENTS } from "./TreatmentPanel";

interface PriceListModalProps {
  onClose: () => void;
}

function formatThousands(value: number): string {
  return value.toLocaleString("es-AR");
}

export function PriceListModal({ onClose }: PriceListModalProps) {
  const queryClient = useQueryClient();
  const [prices, setPrices] = useState<Record<string, number | undefined>>({});

  const { data: savedPrices = [] } = useQuery({
    queryKey: ["treatmentPrices"],
    queryFn: getTreatmentPrices,
  });

  useEffect(() => {
    const map: Record<string, number | undefined> = {};
    savedPrices.forEach(p => { if (p.price) map[p.treatment_type] = p.price; });
    setPrices(map);
  }, [savedPrices]);

  const saveMutation = useMutation({
    mutationFn: () => saveTreatmentPrices(
      TREATMENTS
        .filter(t => prices[t.type])
        .map(t => ({ treatment_type: t.type, price: prices[t.type]! }))
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatmentPrices"] });
      onClose();
    },
    onError: () => alert("Error al guardar la lista de precios"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b shrink-0">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground">Lista de precios</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-2 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-2">Precios de referencia por tipo de tratamiento, solo para vos. No modifican tratamientos ya cargados.</p>
          {TREATMENTS.map(t => (
            <div key={t.type} className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-foreground flex-1">{t.label}</label>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={prices[t.type] !== undefined ? formatThousands(prices[t.type]!) : ""}
                  onChange={e => {
                    const digitsOnly = e.target.value.replace(/\D/g, "");
                    setPrices(prev => ({ ...prev, [t.type]: digitsOnly === "" ? undefined : parseInt(digitsOnly, 10) }));
                  }}
                  placeholder="0"
                  className="w-full border border-input bg-background pl-5 pr-2 py-1.5 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="p-5 border-t flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-input rounded-xl hover:bg-muted text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium shadow-md shadow-primary/30 disabled:opacity-50 transition-all">
            {saveMutation.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
