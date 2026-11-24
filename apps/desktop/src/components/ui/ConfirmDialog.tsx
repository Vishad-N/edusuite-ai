import { useRef, type ReactNode } from "react";
import { Button } from "./Button.tsx";
import { Modal } from "./Modal.tsx";
import { tx } from "../../i18n/index.ts";

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** "danger" for irreversible actions such as cancelling a receipt. */
  tone?: "default" | "danger";
  /** While true, the confirm button shows a spinner and the dialog can't be dismissed. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Replaces window.confirm(). Focus starts on Cancel, so pressing Enter by
 * accident never confirms a destructive action.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = tx("रद्द करें"),
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      initialFocusRef={cancelRef}
      dismissible={!busy}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-body text-ink">{message}</div>
    </Modal>
  );
}
