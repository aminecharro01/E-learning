"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard

import type { ReactNode } from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

type Props = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  children: ReactNode;
};

const sizeStyles = {
  sm: "text-xs",
  md: "text-sm",
};

const variants: Record<BadgeVariant, Record<BadgeColor, string>> = {
  light: {
    primary: "bg-[var(--alert-info-bg)] text-[var(--alert-info-fg)]",
    success: "bg-[var(--alert-success-bg)] text-[var(--alert-success-fg)]",
    error: "bg-[var(--alert-error-bg)] text-[var(--alert-error-fg)]",
    warning: "bg-[var(--alert-warning-bg)] text-[var(--alert-warning-fg)]",
    info: "bg-[var(--alert-info-bg)] text-[var(--alert-info-fg)]",
    light: "bg-surface-2 text-muted",
    dark: "bg-neutral text-[var(--neutral-fg)]",
  },
  solid: {
    primary: "bg-primary text-[var(--primary-fg)]",
    success: "bg-success text-[var(--success-fg)]",
    error: "bg-danger text-danger-fg",
    warning: "bg-warning text-[var(--warning-fg)]",
    info: "bg-primary text-[var(--primary-fg)]",
    light: "bg-neutral text-[var(--neutral-fg)]",
    dark: "bg-secondary text-secondary-fg",
  },
};

export function Badge({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${sizeStyles[size]} ${variants[variant][color]}`}
    >
      {startIcon && <span className="mr-0.5">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-0.5">{endIcon}</span>}
    </span>
  );
}
