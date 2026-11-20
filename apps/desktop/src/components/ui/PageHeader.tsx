import type { ReactNode } from "react";
import { cn } from "./cn.ts";

export type PageHeaderProps = {
  title: ReactNode;
  /** Decorative icon shown before the title. */
  icon?: ReactNode;
  /** Short neutral tag next to the title, e.g. "PPTX". */
  badge?: ReactNode;
  description?: ReactNode;
  /** Buttons for the screen. Put secondary actions first and the primary action last. */
  actions?: ReactNode;
  className?: string;
};

/**
 * The title row every tool screen starts with: one h1, a muted description,
 * and the screen's actions on the right. Uses a <div>, not <header>, so the
 * print CSS (which hides <header>) leaves printed output unchanged.
 */
export function PageHeader({ title, icon, badge, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {icon && (
            <span aria-hidden="true" className="inline-flex text-ink">
              {icon}
            </span>
          )}
          <h1 className="text-heading font-bold text-ink">{title}</h1>
          {badge && (
            <span className="rounded-control border border-line px-2 py-0.5 text-caption font-medium text-muted">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="mt-1 max-w-3xl text-label text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>}
    </div>
  );
}
