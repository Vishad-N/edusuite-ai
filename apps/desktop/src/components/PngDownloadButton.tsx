import { useState, type RefObject } from "react";
import { Download } from "lucide-react";
import { canExportPng, exportElementAsPng } from "../utils/exportPng.ts";
import { tx } from "../i18n/index.ts";
import { Button, useToast } from "./ui/index.ts";

/** "PNG डाउनलोड करें" for a design on screen, at an exact size (DN-072). */
export function PngDownloadButton({
  target,
  width,
  height,
  fileName,
  disabled = false,
}: {
  target: RefObject<HTMLElement | null>;
  width: number;
  height: number;
  fileName: string;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!canExportPng()) return <span className="text-caption text-muted">{tx("PNG डाउनलोड केवल डेस्कटॉप ऐप में होता है।")}</span>;

  const run = async () => {
    if (!target.current) return;
    setBusy(true);
    try {
      const res = await exportElementAsPng(target.current, { width, height, fileName });
      if (res.saved) toast.show({ tone: "success", title: tx("PNG सेव हो गई: {0}", [res.fileName ?? fileName]) });
    } catch {
      toast.show({ tone: "error", title: tx("PNG नहीं बन पाई। फिर से कोशिश करें।") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="primary" icon={<Download className="size-4" aria-hidden="true" />} loading={busy} disabled={disabled} onClick={() => void run()}>
      {tx("PNG डाउनलोड करें ({0}×{1})", [String(width), String(height)])}
    </Button>
  );
}
