import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Mail, MessageCircle, Search, Copy, Check } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { getRecipients, startEmailSend, getSendJob, promotionImageUrl, type Promotion, type Recipient, type SendJob } from "../../api/promotionApi";

interface Props {
  promotion: Promotion;
  channel: "email" | "whatsapp";
  onClose: () => void;
}

const MAX_LIST_ROWS = 100;
const GMAIL_DAILY_LIMIT_WARNING = 400;

const hasEmail = (r: Recipient) => r.email.includes("@");
const waNumber = (r: Recipient) => r.phone.replace(/\D/g, "");
const hasPhone = (r: Recipient) => waNumber(r).length >= 8;

export function SendPromotionModal({ promotion, channel, onClose }: Props) {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const isEmail = channel === "email";

  const [mode, setMode] = useState<"selected" | "all">("selected");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const [starting, setStarting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SendJob | null>(null);

  const [opened, setOpened] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const { data: recipients = [], isLoading } = useQuery({ queryKey: ["promotionRecipients"], queryFn: getRecipients });

  const canReach = isEmail ? hasEmail : hasPhone;
  const pool = mode === "all" ? recipients : recipients.filter(r => selected.has(r.id));
  const eligible = pool.filter(canReach);
  const skipped = pool.length - eligible.length;

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.phone.includes(q));
  }, [recipients, search]);

  useEffect(() => {
    if (!jobId) return;
    let stopped = false;
    const tick = async () => {
      try {
        const j = await getSendJob(jobId);
        if (stopped) return;
        setJob(j);
        if (j.done) clearInterval(timer);
      } catch {
        // si falla un poll puntual, el proximo intento lo recupera
      }
    };
    const timer = setInterval(tick, 1500);
    tick();
    return () => { stopped = true; clearInterval(timer); };
  }, [jobId]);

  const running = starting || (jobId !== null && !(job?.done));
  const finished = !!job?.done;

  const toggle = (id: number) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectAllMatches = () => setSelected(prev => {
    const next = new Set(prev);
    matches.forEach(r => next.add(r.id));
    return next;
  });

  const handleSendEmail = async () => {
    if (eligible.length === 0) return;
    const target = mode === "all"
      ? `a TODOS los pacientes con mail (${eligible.length})`
      : `a ${eligible.length} paciente${eligible.length !== 1 ? "s" : ""}`;
    const warn = eligible.length > GMAIL_DAILY_LIMIT_WARNING
      ? " Ojo: Gmail limita a unos 500 mails por día, así que los últimos podrían no salir."
      : "";
    const ok = await confirmDialog({
      message: `¿Enviar "${promotion.title}" ${target}? Los mails salen de verdad y no se pueden deshacer.${warn}`,
      confirmLabel: "Enviar",
      danger: mode === "all",
    });
    if (!ok) return;
    setStarting(true);
    try {
      const r = await startEmailSend(promotion.id, mode === "all" ? null : Array.from(selected));
      setJobId(r.job_id);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "No se pudo iniciar el envío");
    } finally {
      setStarting(false);
    }
  };

  const copyImage = async () => {
    try {
      let blob = await (await fetch(promotionImageUrl(promotion))).blob();
      if (blob.type !== "image/png") {
        // El portapapeles solo acepta PNG de forma confiable.
        const bmp = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        canvas.getContext("2d")!.drawImage(bmp, 0, 0);
        blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      toast.success("Imagen copiada. Pegala con Ctrl+V en el chat de WhatsApp.");
    } catch {
      toast.error("No se pudo copiar la imagen. Descargala desde la vista ampliada y adjuntala a mano.");
    }
  };

  const openWhatsApp = (r: Recipient) => {
    const firstName = r.name.split(" ")[0] || "";
    const text = `Hola ${firstName}!\n${promotion.title}${promotion.message ? `\n${promotion.message}` : ""}`;
    window.open(`https://wa.me/${waNumber(r)}?text=${encodeURIComponent(text)}`, "_blank");
    setOpened(prev => new Set(prev).add(r.id));
  };

  const pendingWa = eligible.filter(r => !opened.has(r.id));
  const progress = job && job.total > 0 ? Math.round(((job.sent + job.failed) / job.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <header className="flex items-center justify-between gap-3 p-4 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src={promotionImageUrl(promotion)} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                {isEmail ? <Mail className="h-4 w-4 text-primary" /> : <MessageCircle className="h-4 w-4 text-[#25D366]" />}
                Enviar por {isEmail ? "mail" : "WhatsApp"}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{promotion.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground shrink-0">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Destinatarios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {([
              { value: "selected", title: "Pacientes seleccionados", desc: "Elegís uno por uno a quién enviarle" },
              { value: "all", title: "Todos los pacientes", desc: isEmail ? "A todos los que tengan mail cargado" : "A todos los que tengan teléfono cargado" },
            ] as const).map(o => (
              <button
                key={o.value}
                type="button"
                disabled={running || finished}
                onClick={() => setMode(o.value)}
                className={`text-left p-3 rounded-xl border transition-colors disabled:opacity-60 ${mode === o.value ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50"}`}
              >
                <p className="text-sm font-semibold">{o.title}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </button>
            ))}
          </div>

          {mode === "selected" && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, mail o teléfono..."
                  className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{selected.size} seleccionado{selected.size !== 1 ? "s" : ""}</span>
                <span className="flex gap-3">
                  <button type="button" onClick={selectAllMatches} disabled={running || finished || matches.length === 0} className="text-primary font-semibold hover:underline disabled:opacity-50">
                    Seleccionar los {matches.length} que coinciden
                  </button>
                  <button type="button" onClick={() => setSelected(new Set())} disabled={running || finished || selected.size === 0} className="font-semibold hover:underline disabled:opacity-50">
                    Limpiar
                  </button>
                </span>
              </div>
              <div className="border border-border/60 rounded-xl max-h-52 overflow-y-auto divide-y divide-border/40">
                {isLoading ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">Cargando pacientes...</p>
                ) : matches.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">Sin resultados.</p>
                ) : matches.slice(0, MAX_LIST_ROWS).map(r => {
                  const reachable = canReach(r);
                  return (
                    <label key={r.id} className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40 ${reachable ? "" : "opacity-50"}`}>
                      <input type="checkbox" checked={selected.has(r.id)} disabled={running || finished} onChange={() => toggle(r.id)} className="h-4 w-4 accent-primary" />
                      <span className="flex-1 min-w-0 truncate font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[45%]">
                        {reachable ? (isEmail ? r.email : r.phone) : (isEmail ? "sin mail" : "sin teléfono")}
                      </span>
                    </label>
                  );
                })}
              </div>
              {matches.length > MAX_LIST_ROWS && (
                <p className="text-xs text-muted-foreground">Mostrando {MAX_LIST_ROWS} de {matches.length}. Refiná la búsqueda para ver el resto.</p>
              )}
            </div>
          )}

          {/* Resumen */}
          <div className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2 text-sm">
            Se {isEmail ? "enviará" : "podrá enviar"} a <strong>{eligible.length}</strong> paciente{eligible.length !== 1 ? "s" : ""}
            {skipped > 0 && <span className="text-muted-foreground"> · {skipped} se omite{skipped !== 1 ? "n" : ""} por no tener {isEmail ? "mail" : "teléfono"} cargado</span>}
          </div>

          {/* Progreso del mail */}
          {isEmail && jobId && (
            <div className="rounded-xl border border-border/60 p-3 space-y-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${finished ? 100 : progress}%` }} />
              </div>
              <p className="text-sm">
                {!job ? "Iniciando envío..." : finished
                  ? <>Listo: <strong>{job.sent}</strong> enviado{job.sent !== 1 ? "s" : ""}{job.failed > 0 && <>, <strong className="text-rose-600">{job.failed}</strong> con error</>}.</>
                  : <>Enviando... {job.sent + job.failed} de {job.total}</>}
              </p>
              {job?.error && <p className="text-sm text-rose-600 font-medium">{job.error}</p>}
              {job && job.errors.length > 0 && (
                <ul className="text-xs text-rose-600 space-y-0.5 max-h-24 overflow-y-auto">
                  {job.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Lista asistida de WhatsApp */}
          {!isEmail && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#25D366]/40 bg-[#25D366]/5 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  WhatsApp no permite enviar automáticamente ni adjuntar la imagen por link. Hacelo así: <strong>1)</strong> copiá la imagen, <strong>2)</strong> tocá "WhatsApp" en cada paciente (se abre el chat con el texto listo), <strong>3)</strong> pegá la imagen con Ctrl+V y enviá.
                </p>
                <button type="button" onClick={copyImage} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-background text-xs font-semibold hover:bg-muted transition-colors">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Imagen copiada" : "Copiar imagen"}
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Abiertos: <strong>{opened.size}</strong> de {eligible.length}</span>
                {pendingWa.length > MAX_LIST_ROWS && <span>Mostrando los próximos {MAX_LIST_ROWS}</span>}
              </div>
              <div className="border border-border/60 rounded-xl max-h-56 overflow-y-auto divide-y divide-border/40">
                {eligible.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">
                    {mode === "selected" ? "Tildá pacientes arriba para armar la lista." : "Ningún paciente tiene teléfono cargado."}
                  </p>
                ) : pendingWa.length === 0 ? (
                  <p className="p-4 text-sm text-emerald-600 text-center font-medium">Ya abriste el chat de todos los pacientes de la lista.</p>
                ) : pendingWa.slice(0, MAX_LIST_ROWS).map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="flex-1 min-w-0 truncate font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.phone}</span>
                    <button type="button" onClick={() => openWhatsApp(r)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#25D366]/15 text-[#128C7E] text-xs font-semibold hover:bg-[#25D366]/25 transition-colors">
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-4 border-t flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors">
            {finished || !isEmail ? "Cerrar" : "Cancelar"}
          </button>
          {isEmail && !finished && (
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={running || eligible.length === 0}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {running ? "Enviando..." : `Enviar a ${eligible.length} paciente${eligible.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
