import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn.ts";

export type TabItem = { id: string; label: ReactNode; disabled?: boolean };

export type TabsProps = {
  /** Accessible name for the tab list. */
  label: string;
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Render the panel for the selected tab. */
  children: ReactNode;
  className?: string;
};

/**
 * WAI-ARIA tabs: one Tab stop for the list, arrow keys move between tabs,
 * Home/End jump to the ends, and the selected tab is underlined (not only
 * coloured) so it still shows in Windows contrast themes.
 */
export function Tabs({ label, tabs, value, onChange, children, className }: TabsProps) {
  const baseId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = tabs.filter((t) => !t.disabled);

  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key) || enabled.length === 0) return;
    e.preventDefault();
    const current = enabled.findIndex((t) => t.id === value);
    let next = current;
    if (e.key === "ArrowRight") next = (current + 1) % enabled.length;
    if (e.key === "ArrowLeft") next = (current - 1 + enabled.length) % enabled.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = enabled.length - 1;
    const target = enabled[next];
    if (!target) return;
    onChange(target.id);
    refs.current[tabs.indexOf(target)]?.focus();
  };

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} onKeyDown={move} className="flex gap-1 border-b border-line">
        {tabs.map((tab, i) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-label cursor-pointer whitespace-nowrap",
                "disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent font-medium text-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${value}`}
        tabIndex={0}
        className="pt-4"
      >
        {children}
      </div>
    </div>
  );
}
