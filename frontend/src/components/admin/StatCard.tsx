"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard

import type { ReactNode } from "react";
import { Badge } from "@/components/admin/ui/Badge";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  badge?: { color?: "success" | "error" | "warning" | "info" | "primary"; text: string };
};

export function StatCard({ label, value, hint, icon, badge }: Props) {
  return (
    <div className="card-theme rounded-2xl p-5 md:p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2">
        {icon ?? <span className="text-lg font-semibold text-heading">•</span>}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <span className="text-sm text-muted">{label}</span>
          <h4 className="mt-2 text-xl font-bold text-heading md:text-2xl">{value}</h4>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
        {badge ? (
          <Badge color={badge.color ?? "success"} size="sm">
            {badge.text}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
