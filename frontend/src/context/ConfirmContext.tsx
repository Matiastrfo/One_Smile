import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirmDialog = useCallback<ConfirmFn>((options) => {
    const opts = typeof options === "string" ? { message: options } : options;
    setState(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    setState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => close(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 p-5">
              <div className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 ${state.danger !== false ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400" : "bg-accent text-primary"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                {state.title && <h3 className="font-bold text-foreground mb-1">{state.title}</h3>}
                <p className="text-sm text-muted-foreground">{state.message}</p>
              </div>
              <button onClick={() => close(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-muted/20">
              <button onClick={() => close(false)}
                className="px-4 py-2 border border-input rounded-xl hover:bg-muted text-sm font-medium transition-colors">
                {state.cancelLabel ?? "Cancelar"}
              </button>
              <button onClick={() => close(true)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-all text-white ${state.danger !== false ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30" : "bg-primary hover:bg-primary/90 shadow-primary/30"}`}>
                {state.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
