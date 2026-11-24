import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { tx } from "../i18n/index.ts";

type UpdateStatus = { state: string; version?: string | null; percent?: number };
type UpdateBridge = {
  status: () => Promise<UpdateStatus>;
  install: () => Promise<boolean>;
  onChange: (cb: (s: UpdateStatus) => void) => () => void;
};

/**
 * Shows only when a new version is downloaded (DN-062): one click restarts into it.
 * Checking and downloading happen quietly; an update also installs when the app closes.
 */
export function UpdateButton() {
  const bridge = (window as unknown as { edusuite?: { update?: UpdateBridge } }).edusuite?.update;
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    if (!bridge?.onChange) return;
    let alive = true;
    void bridge.status().then((s) => alive && setStatus(s));
    const off = bridge.onChange((s) => setStatus(s));
    return () => {
      alive = false;
      off();
    };
  }, [bridge]);

  if (status?.state !== "ready" || !bridge) return null;
  return (
    <button
      type="button"
      onClick={() => void bridge.install()}
      className="flex items-center gap-1.5 rounded-lg border border-emerald-400/60 bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200 cursor-pointer hover:bg-emerald-500/25"
      title={tx("नया संस्करण डाउनलोड हो चुका है। ऐप दोबारा शुरू होकर अपडेट हो जाएगा।")}
    >
      <RefreshCw className="w-3 h-3" aria-hidden="true" />
      {tx("अपडेट तैयार")}{status.version ? ` (${status.version})` : ""}{tx(": दोबारा शुरू करें")}
    </button>
  );
}
