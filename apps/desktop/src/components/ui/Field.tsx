import {
  createContext,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn.ts";

type FieldContextValue = {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

export type FieldProps = {
  label: ReactNode;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Error text. When set, the control is marked invalid and the message is announced. */
  error?: ReactNode;
  required?: boolean;
  /** Optional explicit id for the control; otherwise one is generated. */
  id?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Label + control + hint + error, wired together for screen readers:
 * the label is tied to the control, and the hint and error are linked
 * through aria-describedby. Put exactly one Input, Select or Textarea inside.
 */
export function Field({ label, hint, error, required = false, id, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? `field-${autoId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id: controlId, describedBy, invalid: Boolean(error), required }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={controlId} className="text-label font-medium text-ink">
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              {" "}*
            </span>
          )}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-caption text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-caption font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/** Props a control takes from the surrounding Field, if any. */
function useFieldControl(own: { id?: string | undefined; "aria-describedby"?: string | undefined; required?: boolean | undefined }) {
  const field = useContext(FieldContext);
  return {
    id: own.id ?? field?.id,
    "aria-describedby": [own["aria-describedby"], field?.describedBy].filter(Boolean).join(" ") || undefined,
    "aria-invalid": field?.invalid || undefined,
    required: own.required ?? field?.required,
  };
}

const CONTROL =
  "w-full rounded-control border border-line-strong bg-surface text-body text-ink " +
  "placeholder:text-muted disabled:cursor-not-allowed disabled:bg-page disabled:opacity-70 " +
  "aria-invalid:border-danger";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> };

export function Input({ className, ref, ...rest }: InputProps) {
  const wiring = useFieldControl(rest);
  return <input ref={ref} {...rest} {...wiring} className={cn(CONTROL, "h-10 px-3", className)} />;
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> };

export function Textarea({ className, rows = 4, ref, ...rest }: TextareaProps) {
  const wiring = useFieldControl(rest);
  return (
    <textarea ref={ref} rows={rows} {...rest} {...wiring} className={cn(CONTROL, "px-3 py-2 resize-y", className)} />
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> };

export function Select({ className, children, ref, ...rest }: SelectProps) {
  const wiring = useFieldControl(rest);
  return (
    <select ref={ref} {...rest} {...wiring} className={cn(CONTROL, "h-10 px-3 cursor-pointer", className)}>
      {children}
    </select>
  );
}
