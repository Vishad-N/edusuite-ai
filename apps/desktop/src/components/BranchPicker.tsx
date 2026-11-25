import { useState } from "react";
import { MapPin } from "lucide-react";
import { useSession, useSignedInUser } from "../api/session.tsx";
import { ApiError } from "../api/client.ts";
import { tx } from "../i18n/index.ts";
import { Button } from "./ui/index.ts";

/**
 * After signing in, staff who work at more than one branch choose today's branch
 * (DN-070, DN-015). The list comes from the server; the server checks the choice again.
 */
export function BranchPicker() {
  const user = useSignedInUser();
  const { switchBranch, finishBranchPick } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const choose = async (branchId: string) => {
    setError("");
    if (branchId === user.branch.id) return finishBranchPick();
    setBusy(branchId);
    try {
      await switchBranch(branchId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tx("ब्रांच नहीं बदली जा सकी। फिर से कोशिश करें।"));
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-page flex items-center justify-center p-6">
      <section aria-labelledby="branch-pick-title" className="w-full max-w-md bg-surface border border-line rounded-card p-6 space-y-4 shadow-sm">
        <div className="space-y-1">
          <h1 id="branch-pick-title" className="text-heading font-bold text-ink">
            {tx("आज किस ब्रांच में काम करेंगे?")}
          </h1>
          <p className="text-label text-muted">{tx("{0}, आप इन ब्रांचों में काम कर सकते हैं।", [user.displayName])}</p>
        </div>
        <ul className="space-y-2">
          {user.branches.map((b) => (
            <li key={b.id}>
              <Button
                variant={b.id === user.branch.id ? "primary" : "secondary"}
                className="w-full justify-start"
                icon={<MapPin className="size-4" aria-hidden="true" />}
                loading={busy === b.id}
                disabled={busy !== null}
                onClick={() => void choose(b.id)}
              >
                {b.name} <span className="text-caption opacity-80">({b.code})</span>
                {b.id === user.branch.id && <span className="ml-auto text-caption">{tx("होम ब्रांच")}</span>}
              </Button>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="text-label text-danger">
            {error}
          </p>
        )}
        <p className="text-caption text-muted">{tx("बाद में ऊपर हेडर से ब्रांच बदल सकते हैं।")}</p>
      </section>
    </main>
  );
}
