"use client";

import type { ReactNode } from "react";

type Props = {
  loading: boolean;
  children: ReactNode;
  className?: string;
};

/** Submit wrapper with runway light animation while loading */
export function AuthRunwaySubmit({ loading, children, className = "" }: Props) {
  return (
    <div className={`auth-runway-wrap ${loading ? "is-loading" : ""} ${className}`}>
      <div className="auth-runway-track" aria-hidden>
        <div className="auth-runway-lights" />
      </div>
      {children}
    </div>
  );
}

export function passwordStrengthLabel(password: string): { label: string; level: 0 | 1 | 2 | 3 } {
  if (!password) return { label: "Saisissez un mot de passe", level: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Faible — ajoutez des chiffres et majuscules", level: 1 };
  if (score === 2) return { label: "Correct — presque prêt au décollage", level: 2 };
  return { label: "Fort — prêt au décollage", level: 3 };
}
