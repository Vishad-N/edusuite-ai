import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "./cn.ts";

export type TableProps = HTMLAttributes<HTMLTableElement> & {
  /** Describes the table for screen readers. Hidden visually unless showCaption is set. */
  caption: ReactNode;
  showCaption?: boolean;
};

/**
 * Semantic table in a horizontally scrollable wrapper. The wrapper is focusable
 * (tabIndex 0) so keyboard users can scroll a wide table with the arrow keys.
 */
export function Table({ caption, showCaption = false, className, children, ...rest }: TableProps) {
  return (
    <div
      className="w-full overflow-x-auto rounded-card border border-line bg-surface"
      tabIndex={0}
      role="region"
      aria-label={typeof caption === "string" ? caption : undefined}
    >
      <table className={cn("w-full border-collapse text-left text-label", className)} {...rest}>
        <caption className={showCaption ? "px-4 py-3 text-left text-label text-muted" : "sr-only"}>
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-line bg-page", className)} {...rest} />;
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-line", className)} {...rest} />;
}

export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-page", className)} {...rest} />;
}

export function TH({ className, scope = "col", ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope={scope}
      className={cn("px-4 py-3 text-caption font-semibold text-muted whitespace-nowrap", className)}
      {...rest}
    />
  );
}

export function TD({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-ink", className)} {...rest} />;
}
