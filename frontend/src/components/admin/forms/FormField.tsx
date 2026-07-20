// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Modified: reconnected to Spring Boot API, removed mock data, added role-based rendering

import type { FieldError } from "react-hook-form";
import type { ReactNode } from "react";
import { inputClass as themeInputClass } from "@/lib/ui";

type Props = {
  label: string;
  htmlFor?: string;
  error?: FieldError;
  children: ReactNode;
  hint?: string;
};

export function FormField({ label, htmlFor, error, children, hint }: Props) {
  return (
    <label className="block text-sm font-medium text-heading" htmlFor={htmlFor}>
      {label}
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-[var(--alert-error-fg)]">{error.message}</p>}
    </label>
  );
}

export const inputClass = themeInputClass;
