import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "./cn.ts";
import { ToastContext, type ToastInput, type ToastTone } from "./toastContext.ts";

type ToastItem = Required<Pick<ToastInput, "tone" | "title">> & { id: number; description?: string };

/** Success and info toasts close themselves; errors stay until dismissed. */
const AUTO_DISMISS_MS = 6000;

/**
 * Wrap the app once. Toasts appear bottom-right inside two live regions:
 * polite for success/info, assertive for errors, so screen readers announce them.
 */
export function ToastProvider({ children, closeLabel = "सूचना बंद करें" }: { children: ReactNode; closeLabel?: string }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    const item: ToastItem = { id, tone: input.tone ?? "info", title: input.title };
    if (input.description) item.description = input.description;
    setToasts((all) => [...all.slice(-3), item]);
  }, []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  const polite = toasts.filter((t) => t.tone !== "error");
  const urgent = toasts.filter((t) => t.tone === "error");

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2 no-print">
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          {polite.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={dismiss} closeLabel={closeLabel} />
          ))}
        </div>
        <div role="alert" aria-live="assertive" className="flex flex-col gap-2">
          {urgent.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={dismiss} closeLabel={closeLabel} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

const TONES: Record<ToastTone, { icon: ReactNode; className: string }> = {
  success: { icon: <CheckCircle2 className="size-5 text-success" />, className: "border-success" },
  error: { icon: <AlertTriangle className="size-5 text-danger" />, className: "border-danger" },
  info: { icon: <Info className="size-5 text-muted" />, className: "border-line-strong" },
};

function ToastCard({
  toast,
  onDismiss,
  closeLabel,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
  closeLabel: string;
}) {
  useEffect(() => {
    if (toast.tone === "error") return undefined;
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const tone = TONES[toast.tone];
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-card border border-l-4 bg-surface px-4 py-3 text-ink",
        tone.className,
      )}
    >
      <span aria-hidden="true" className="mt-0.5">
        {tone.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-label font-semibold">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-caption text-muted">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={closeLabel}
        className="-mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-control border border-transparent text-muted hover:bg-page hover:text-ink cursor-pointer"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
