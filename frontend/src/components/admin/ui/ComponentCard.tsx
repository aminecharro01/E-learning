"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard

import type { ReactNode } from "react";

type Props = {
  title: string;
  desc?: string;
  className?: string;
  children: ReactNode;
  action?: ReactNode;
};

/**
 * Panel card — glass style within app-horizon shell.
 */
export function ComponentCard({ title, desc = "", className = "", children, action }: Props) {
  return (
    <div className={`card-theme overflow-hidden rounded-2xl ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-heading">{title}</h3>
          {desc ? <p className="mt-1 text-sm text-muted">{desc}</p> : null}
        </div>
        {action}
      </div>
      <div className="border-t border-theme p-4 sm:p-6">{children}</div>
    </div>
  );
}
