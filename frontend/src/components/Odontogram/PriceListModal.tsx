import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, X, FileText, Upload } from "lucide-react";
import { getMyProfile, uploadPriceList } from "../../api/profileApi";
import { useToast } from "../../context/ToastContext";

interface PriceListModalProps {
  onClose: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function PriceListModal({ onClose }: PriceListModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadPriceList,
    onMutate: () => setUploading(true),
    onSuccess: () => {
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
    },
    onError: (err: any) => {
      setUploading(false);
      toast.error(err.response?.data?.detail || "No se pudo subir el PDF");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  const priceListUrl = profile?.price_list_path ? `${API_BASE}${profile.price_list_path}` : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground">Lista de precios</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Subí un PDF con tu lista de precios para tenerlo siempre a mano mientras trabajás el odontograma.</p>

          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} />

          {priceListUrl ? (
            <div className="space-y-3">
              <a href={priceListUrl} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 text-sm font-semibold transition-colors">
                <FileText className="h-4 w-4 text-primary" /> Ver PDF
              </a>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 hover:bg-accent text-sm font-medium transition-colors disabled:opacity-50">
                <Upload className="h-4 w-4" /> {uploading ? "Subiendo..." : "Reemplazar PDF"}
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed border-border/60 hover:border-primary hover:bg-accent/50 text-sm font-medium text-muted-foreground transition-colors disabled:opacity-50">
              <Upload className="h-6 w-6" />
              {uploading ? "Subiendo..." : "Subir PDF de lista de precios"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
