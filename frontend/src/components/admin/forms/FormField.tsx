// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Modified: reconnected to Spring Boot API, removed mock data, added role-based rendering

import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import type { ReactNode } from "react";
import { inputClass as themeInputClass } from "@/lib/ui";

type Props = {
  label: string;
  htmlFor?: string;
  error?: FieldError;
  children: ReactNode;
  hint?: string;
  required?: boolean;
};

export function FormField({ label, htmlFor, error, children, hint, required }: Props) {
  return (
    <label className="block text-sm font-medium text-heading" htmlFor={htmlFor}>
      {label}
      {required && (
        <span className="ml-0.5 text-[var(--alert-error-fg)]" aria-hidden>
          *
        </span>
      )}
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-[var(--alert-error-fg)]" role="alert">
          {error.message}
        </p>
      )}
    </label>
  );
}

export const inputClass = themeInputClass;

/** Same input styling, plus a red ring once the field has a validation error. */
export function fieldClass(hasError?: boolean) {
  return hasError ? `${themeInputClass} input-error` : themeInputClass;
}

/**
 * Boolean setting rendered as a switch instead of a bare checkbox — several
 * native checkboxes in a row are hard to scan for on/off at a glance. The
 * underlying checkbox stays real (full keyboard/screen-reader semantics);
 * the switch look is pure CSS via :has(), see .toggle-row in globals.css.
 */
export function Toggle({
  label,
  description,
  registration,
}: {
  label: string;
  description?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <label className="toggle-row flex cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" className="sr-only" {...registration} />
      <span className="toggle-switch mt-0.5" aria-hidden>
        <span className="toggle-switch-thumb" />
      </span>
      <span>
        <span className="block text-sm font-medium text-body">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

/** Groups related fields under a heading so a long form reads as sections, not a wall of inputs. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="border-t border-theme pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-3 w-full">
        <span className="block text-sm font-semibold text-heading">{title}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
