"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

type Props = {
  id: string;
  onClick: () => void;
  children: ReactNode;
};

/** A breadcrumb entry that's also a drop target — lets you drag a file up onto
 *  an ancestor folder without navigating into it first. */
export function BreadcrumbCrumb({ id, onClick, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "folder" } });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-1 hover:underline ${
        isOver ? "bg-[var(--surface-muted)] ring-1 ring-[var(--accent)]" : ""
      }`}
    >
      {children}
    </button>
  );
}
