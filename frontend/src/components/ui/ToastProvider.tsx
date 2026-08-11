"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { subscribeToasts, toast, type ToastItem } from "@/lib/toast-store";

const VARIANT_ALERT_CLASS: Record<ToastItem["variant"], string> = {
  success: "alert-success",
  error: "alert-error",
  warning: "alert-warning",
  info: "alert-info",
};

export function ToastProvider() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`alert pointer-events-auto flex w-full max-w-sm items-start gap-3 ${VARIANT_ALERT_CLASS[item.variant]}`}
          style={{ boxShadow: "var(--shadow-brand)" }}
        >
          <span className="flex-1">{item.message}</span>
          <button
            type="button"
            onClick={() => toast.dismiss(item.id)}
            aria-label="Fermer la notification"
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
