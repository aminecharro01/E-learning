"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Modified: reconnected to Spring Boot API, removed mock data, added role-based rendering

import { Pencil, Eye, Trash2, Blocks, CheckCircle2, CircleMinus } from "lucide-react";
import { btn } from "@/lib/ui";

type IconButtonProps = {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  tone?: "default" | "success" | "danger" | "warn";
  children: React.ReactNode;
};

const toneClass: Record<NonNullable<IconButtonProps["tone"]>, string> = {
  default: btn.icon,
  success: "btn btn-success btn-icon",
  danger: "btn btn-danger btn-icon",
  warn: "btn btn-warning btn-icon",
};

export function IconButton({ label, onClick, tone = "default", children }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`${toneClass[tone]} h-9 w-9`}
    >
      {children}
    </button>
  );
}

export function IconEdit() {
  return <Pencil size={16} aria-hidden />;
}

export function IconEye() {
  return <Eye size={16} aria-hidden />;
}

export function IconTrash() {
  return <Trash2 size={16} aria-hidden />;
}

export function IconBlocks() {
  return <Blocks size={16} aria-hidden />;
}

export function IconPublish({ on }: { on: boolean }) {
  return on ? <CheckCircle2 size={16} aria-hidden /> : <CircleMinus size={16} aria-hidden />;
}
