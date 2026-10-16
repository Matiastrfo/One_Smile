import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, X, Mail, MessageCircle, Trash2, ImagePlus, Save } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { getPromotions, createPromotion, updatePromotion, deletePromotion, promotionImageUrl, type Promotion } from "../../api/promotionApi";
import { SendPromotionModal } from "./SendPromotionModal";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const inputCls = "w-full border border-input bg-background px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function CategoryField({ value, onChange, categories }: { value: string; onChange: (v: string) => void; categories: string[] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold">Categoría</label>
      <input list="promo-categories" value={value} onChange={e => onChange(e.target.value)} placeholder="Ej: Implantes, Blanqueamiento, Ortodoncia..." className={inputCls} />
      <datalist id="promo-categories">
        {categories.map(c => <option key={c} value={c} />)}
      </datalist>
      <p className="text-xs text-muted-foreground">Escribí la que quieras o elegí una existente. Sirve para filtrar tus promociones.</p>
    </div>
  );
}

function NewPromotionModal({ categories, onClose }: { categories: string[]; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const mutation = useMutation({
    mutationFn: () => createPromotion(file!, title.trim(), category.trim() || "General", message.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast.success("Promoción guardada");
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "No se pudo guardar la promoción"),
  });

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_IMAGE_BYTES) { toast.error("La imagen supera los 10MB."); return; }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="font-bold text-base">Nueva promoción</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"><X className="h-5 w-5" /></button>
        </header>
        <div className="overflow-y-auto p-4 space-y-4">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-border/70 hover:border-primary/60 hover:bg-muted/30 transition-colors overflow-hidden">
            {preview ? (
              <img src={preview} alt="Vista previa" className="w-full max-h-64 object-contain bg-muted/30" />
            ) : (
              <span className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">Elegir imagen (JPG, PNG o WEBP, máx. 10MB)</span>
              </span>
            )}
          </button>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Título</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: 20% de descuento en limpieza" className={inputCls} />
          </div>
          <CategoryField value={category} onChange={setCategory} categories={categories} />
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Texto que acompaña la imagen <span className="font-normal text-muted-foreground">(opcional)</span></label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Se envía junto con la imagen por mail y WhatsApp." className={`${inputCls} resize-none`} />
          </div>
        </div>
        <footer className="p-4 border-t flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted/50">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={!file || !title.trim() || mutation.isPending}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 disabled:opacity-50">
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function PromotionDetailModal({ promotion, categories, onClose, onSend }: {
  promotion: Promotion;
  categories: string[];
  onClose: () => void;
  onSend: (channel: "email" | "whatsapp") => void;
}) {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(promotion.title);
  const [category, setCategory] = useState(promotion.category);
  const [message, setMessage] = useState(promotion.message ?? "");

  const dirty = title !== promotion.title || category !== promotion.category || message !== (promotion.message ?? "");

  const saveMutation = useMutation({
    mutationFn: () => updatePromotion(promotion.id, { title: title.trim(), category: category.trim() || "General", message: message.trim() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["promotions"] }); toast.success("Cambios guardados"); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.detail || "No se pudieron guardar los cambios"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePromotion(promotion.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["promotions"] }); toast.success("Promoción eliminada"); onClose(); },
    onError: () => toast.error("No se pudo eliminar la promoción"),
  });

  const handleDelete = async () => {
    if (await confirmDialog({ message: `¿Eliminar la promoción "${promotion.title}"?`, confirmLabel: "Eliminar", danger: true })) deleteMutation.mutate();
  };

  // No se puede enviar con cambios sin guardar: lo enviado tiene que coincidir con lo que se ve.
  const trySend = (channel: "email" | "whatsapp") => {
    if (dirty) { toast.error("Guardá los cambios antes de enviar."); return; }
    onSend(channel);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="font-bold text-base truncate">{promotion.title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"><X className="h-5 w-5" /></button>
        </header>
        <div className="overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5 p-4">
          <img src={promotionImageUrl(promotion)} alt={promotion.title} className="w-full max-h-[60vh] object-contain rounded-xl bg-muted/30" />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Título</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
            </div>
            <CategoryField value={category} onChange={setCategory} categories={categories} />
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Texto que acompaña la imagen</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} className={`${inputCls} resize-none`} />
            </div>
            <p className="text-xs text-muted-foreground">Cargada el {promotion.created_at}</p>
          </div>
        </div>
        <footer className="p-4 border-t flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button onClick={handleDelete} disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors">
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
          <div className="flex flex-wrap gap-2">
            {dirty && (
              <button onClick={() => saveMutation.mutate()} disabled={!title.trim() || saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary/10 disabled:opacity-50">
                <Save className="h-4 w-4" /> {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </button>
            )}
            <button onClick={() => trySend("whatsapp")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#25D366] text-white hover:bg-[#1ebe5b] transition-colors">
              <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
            </button>
            <button onClick={() => trySend("email")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-md shadow-primary/30 hover:bg-primary/90 transition-colors">
              <Mail className="h-4 w-4" /> Enviar por mail
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function PromotionsPage() {
  const [filter, setFilter] = useState<string>("ALL");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<Promotion | null>(null);
  const [sending, setSending] = useState<{ promotion: Promotion; channel: "email" | "whatsapp" } | null>(null);

  const { data: promotions = [], isLoading } = useQuery({ queryKey: ["promotions"], queryFn: getPromotions });

  const categories = useMemo(() => Array.from(new Set(promotions.map(p => p.category))).sort((a, b) => a.localeCompare(b)), [promotions]);
  const visible = filter === "ALL" ? promotions : promotions.filter(p => p.category === filter);

  // Si se borra la ultima promocion de una categoria que estaba filtrada, vuelve a "Todas".
  useEffect(() => {
    if (filter !== "ALL" && !categories.includes(filter)) setFilter("ALL");
  }, [categories, filter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary shrink-0">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Promociones</h2>
            <p className="text-muted-foreground text-sm">Cargá las imágenes de tus promociones y enviáselas a tus pacientes por mail y WhatsApp.</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 hover:bg-primary/90 transition-colors shrink-0">
          <Plus className="h-4 w-4" /> Nueva promoción
        </button>
      </header>

      {promotions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${filter === "ALL" ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:bg-accent"}`}>
            Todas ({promotions.length})
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${filter === c ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:bg-accent"}`}>
              {c} ({promotions.filter(p => p.category === c).length})
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground py-10 animate-pulse">Cargando promociones...</p>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl text-muted-foreground">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Todavía no cargaste ninguna promoción.</p>
          <button onClick={() => setShowNew(true)} className="text-primary text-sm font-semibold hover:underline mt-2">+ Cargar la primera</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {visible.map(p => (
            <button key={p.id} onClick={() => setDetail(p)}
              className="group text-left rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/40 transition-all">
              <div className="aspect-[4/3] bg-muted/30 overflow-hidden">
                <img src={promotionImageUrl(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-3 space-y-1.5">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.category}</span>
                <p className="text-sm font-semibold leading-snug line-clamp-2">{p.title}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showNew && <NewPromotionModal categories={categories} onClose={() => setShowNew(false)} />}
      {detail && (
        <PromotionDetailModal
          key={detail.id}
          promotion={detail}
          categories={categories}
          onClose={() => setDetail(null)}
          onSend={channel => setSending({ promotion: detail, channel })}
        />
      )}
      {sending && <SendPromotionModal promotion={sending.promotion} channel={sending.channel} onClose={() => setSending(null)} />}
    </div>
  );
}
