import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "./cn.ts";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy and blocks clicks. Keep the label so the width doesn't jump. */
  loading?: boolean;
  /** Icon shown before the label. Decorative: give the button a text label or aria-label. */
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

// Every variant keeps a border (transparent where not visible) so Windows
// contrast themes still draw the button's edge.
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-ink border-transparent hover:bg-accent-hover active:bg-accent-hover font-semibold",
  secondary:
    "bg-surface text-ink border-line-strong hover:bg-page active:bg-line font-medium",
  ghost: "bg-transparent text-ink border-transparent hover:bg-page active:bg-line font-medium",
  danger:
    "bg-danger text-ink-inverse border-transparent hover:bg-danger-hover active:bg-danger-hover font-semibold",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 gap-1.5 text-label",
  md: "h-10 px-4 gap-2 text-label",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  icon,
  type = "button",
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-control border whitespace-nowrap",
        "transition-colors duration-150 cursor-pointer",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <span aria-hidden="true" className="inline-flex">{icon}</span> : null}
      {children}
    </button>
  );
}

/** Small decorative spinner; the busy state is announced through aria-busy on the parent. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}
