import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { cn } from "./cn.ts";
import { tx } from "../../i18n/index.ts";

export type ModalProps = {
  open: boolean;
  /** Called on Esc, the close button, or a click on the backdrop. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons row. Put the primary action last. */
  footer?: ReactNode;
  /** Accessible name of the close button. Defaults to Hindi. */
  closeLabel?: string;
  size?: "sm" | "md" | "lg";
  /** Element to focus on open; defaults to the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Set false to block closing by Esc or backdrop (e.g. while saving). */
  dismissible?: boolean;
};

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl" } as const;

/**
 * Built on the native <dialog> element opened with showModal(): the browser
 * keeps focus inside, makes the rest of the page inert, and closes on Esc.
 * Focus returns to the element that opened it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = tx("बंद करें"),
  size = "md",
  initialFocusRef,
  dismissible = true,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const opener = document.activeElement as HTMLElement | null;
      dialog.showModal();
      initialFocusRef?.current?.focus();
      return () => opener?.focus?.();
    }
    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open, initialFocusRef]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        // Esc: let the parent decide (it owns `open`).
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-card border border-line bg-surface p-0 text-ink",
        "backdrop:bg-inverse/60",
        SIZES[size],
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-title font-semibold">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1 text-label text-muted">
              {description}
            </p>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-transparent text-muted hover:bg-page hover:text-ink cursor-pointer"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
      {children && <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>}
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>
      )}
    </dialog>
  );
}
