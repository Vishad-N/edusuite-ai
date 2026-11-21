import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "./Button.tsx";
import { cn } from "./cn.ts";

export type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Usually one primary Button that creates the first item. */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

/** Shown when a list has nothing in it yet. Never leave a blank area. */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div role="status" className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <span aria-hidden="true" className="text-muted">
        {icon ?? <Inbox className="size-8" />}
      </span>
      <h3 className="text-title font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-md text-label text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export type ErrorStateProps = {
  title: ReactNode;
  /** The translated message from the API's { code, message } error. */
  message?: ReactNode | undefined;
  /** Error code, shown small so support can look it up. */
  code?: string | undefined;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

/** Shown when loading fails. Announced immediately (role="alert"). */
export function ErrorState({
  title,
  message,
  code,
  onRetry,
  retryLabel = "फिर से कोशिश करें",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-danger bg-danger-subtle px-6 py-10 text-center",
        className,
      )}
    >
      <AlertTriangle aria-hidden="true" className="size-8 text-danger" />
      <h3 className="text-title font-semibold text-ink">{title}</h3>
      {message && <p className="max-w-md text-label text-ink">{message}</p>}
      {code && <p className="text-caption text-muted">{code}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export type SkeletonProps = {
  /** Number of placeholder lines. */
  lines?: number;
  /** Announced to screen readers while loading. */
  label?: string;
  className?: string;
};

/** Placeholder lines while content loads. The animation stops under reduced motion. */
export function Skeleton({ lines = 3, label = "लोड हो रहा है…", className }: SkeletonProps) {
  return (
    <div role="status" aria-busy="true" className={cn("flex flex-col gap-3", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn("h-4 animate-pulse rounded-control bg-line", i === lines - 1 && lines > 1 && "w-2/3")}
        />
      ))}
    </div>
  );
}
