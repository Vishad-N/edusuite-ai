import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn.ts";

type DivProps = HTMLAttributes<HTMLDivElement>;

/** Flat panel with a hairline edge. No shadow, no gradient. */
export function Card({ className, ...rest }: DivProps) {
  return <div className={cn("rounded-card border border-line bg-surface", className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: DivProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 border-b border-line px-6 py-4", className)}
      {...rest}
    />
  );
}

/** Card title. Pick the heading level that fits the page outline (default h2). */
export function CardTitle({
  as: Tag = "h2",
  className,
  children,
}: {
  as?: "h2" | "h3" | "h4";
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn("text-title font-semibold text-ink", className)}>{children}</Tag>;
}

export function CardBody({ className, ...rest }: DivProps) {
  return <div className={cn("px-6 py-4", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: DivProps) {
  return (
    <div
      className={cn("flex items-center justify-end gap-3 border-t border-line px-6 py-4", className)}
      {...rest}
    />
  );
}
