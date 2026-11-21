import { createContext, useContext } from "react";

export type ToastTone = "success" | "error" | "info";
export type ToastInput = { tone?: ToastTone | undefined; title: string; description?: string | undefined };
export type ToastApi = { show: (toast: ToastInput) => void; dismiss: (id: number) => void };

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
