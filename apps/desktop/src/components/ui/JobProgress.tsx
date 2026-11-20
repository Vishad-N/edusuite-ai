import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "./Button.tsx";
import { cn } from "./cn.ts";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type JobProgressProps = {
  status: JobStatus;
  /**
   * 0–1, from the server's SSE progress events (Phase 4). Leave undefined when the
   * server can't measure progress: the bar then shows as indeterminate.
   * Never drive this from a timer (AGENT_README golden rule 5).
   */
  progress?: number;
  /** Current stage text from the server, already translated. */
  stage?: ReactNode;
  /** Shown when status is "failed": the API's translated error message. */
  error?: ReactNode;
  labels?: Partial<Record<JobStatus, string>> & { cancel?: string; retry?: string; progress?: string };
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
};

const DEFAULT_LABELS: Record<JobStatus, string> & { cancel: string; retry: string; progress: string } = {
  queued: "कतार में है…",
  running: "बन रहा है…",
  succeeded: "तैयार है",
  failed: "नहीं बन सका",
  cancelled: "रोक दिया गया",
  cancel: "रोकें",
  retry: "फिर से कोशिश करें",
  progress: "प्रगति",
};

/**
 * Real job progress for AI work. The visible stage and status are in a
 * polite live region, so screen readers hear changes without the bar
 * announcing every percentage step.
 */
export function JobProgress({
  status,
  progress,
  stage,
  error,
  labels,
  onCancel,
  onRetry,
  className,
}: JobProgressProps) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const active = status === "queued" || status === "running";
  const pct = progress === undefined ? undefined : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const shownPct = status === "succeeded" ? 100 : pct;

  return (
    <div className={cn("flex flex-col gap-2 rounded-card border border-line bg-surface p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="flex items-center gap-2 text-label font-medium text-ink">
          {status === "succeeded" && <CheckCircle2 aria-hidden="true" className="size-4 text-success" />}
          {status === "failed" && <AlertTriangle aria-hidden="true" className="size-4 text-danger" />}
          <span>{l[status]}</span>
          {active && stage && <span className="font-normal text-muted">· {stage}</span>}
        </p>
        <div className="flex items-center gap-2">
          {shownPct !== undefined && <span className="text-caption tabular-nums text-muted">{shownPct}%</span>}
          {active && onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              {l.cancel}
            </Button>
          )}
          {status === "failed" && onRetry && (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              {l.retry}
            </Button>
          )}
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={l.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shownPct}
        aria-busy={active || undefined}
        className="h-2 w-full overflow-hidden rounded-full border border-transparent bg-line"
      >
        <div
          className={cn(
            "h-full rounded-full forced-colors:bg-[Highlight]",
            status === "failed" ? "bg-danger" : status === "succeeded" ? "bg-success" : "bg-ink",
            shownPct === undefined && active && "w-1/3 animate-pulse",
          )}
          style={shownPct === undefined ? undefined : { width: `${shownPct}%` }}
        />
      </div>

      {status === "failed" && error && (
        <p role="alert" className="text-caption font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
