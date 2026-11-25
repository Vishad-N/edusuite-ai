import { useState, type FormEvent } from "react";
import { useSession } from "../api/session.tsx";
import { ApiError } from "../api/client.ts";
import { tx } from "../i18n/index.ts";
import { Button, Field, Input, Modal, useToast } from "./ui/index.ts";

const MIN = 8;

/**
 * Staff change their own password (DN-070). The server checks the current one, and every
 * other PC signed in as this user is signed out; this one stays signed in.
 */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { client } = useSession();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN;
  const mismatch = again.length > 0 && again !== next;
  const ready = current.length > 0 && next.length >= MIN && again === next && !busy;

  const close = () => {
    setCurrent("");
    setNext("");
    setAgain("");
    setError("");
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      await client.post("/me/password", { currentPassword: current, newPassword: next });
      toast.show({ tone: "success", title: tx("पासवर्ड बदल गया। दूसरे कंप्यूटरों पर फिर से लॉगिन करना होगा।") });
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tx("पासवर्ड नहीं बदला जा सका। फिर से कोशिश करें।"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={tx("पासवर्ड बदलें")} size="sm">
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <Field label={tx("मौजूदा पासवर्ड")} required>
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label={tx("नया पासवर्ड")} hint={tx("कम से कम {0} अक्षर", [String(MIN)])} error={tooShort ? tx("पासवर्ड बहुत छोटा है।") : undefined} required>
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label={tx("नया पासवर्ड दोबारा")} error={mismatch ? tx("दोनों पासवर्ड एक जैसे नहीं हैं।") : undefined} required>
          <Input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="text-label text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={close}>
            {tx("रद्द करें")}
          </Button>
          <Button type="submit" variant="primary" disabled={!ready} loading={busy}>
            {tx("पासवर्ड बदलें")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
