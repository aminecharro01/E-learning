/**
 * Framework-agnostic toast event bus. Lives outside React so non-component code
 * (e.g. the api-client.ts response interceptor) can push a toast without needing
 * hooks or context — ToastProvider just subscribes and renders whatever is here.
 */
export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: number;
  variant: ToastVariant;
  message: string;
};

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(variant: ToastVariant, message: string, durationMs = 5000): number {
  const id = nextId++;
  toasts = [...toasts, { id, variant, message }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => dismiss(id), durationMs);
  }
  return id;
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  warning: (message: string) => push("warning", message),
  info: (message: string) => push("info", message),
  dismiss,
};
