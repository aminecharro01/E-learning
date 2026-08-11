"use client";

import { useDroppable } from "@dnd-kit/core";
import { Folder, Pencil, Trash2 } from "lucide-react";
import type { FolderSummary } from "@/lib/api";
import { btn } from "@/lib/ui";

type Props = {
  folder: FolderSummary;
  isAdmin: boolean;
  view: "grid" | "list";
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export function FolderTile({ folder, isAdmin, view, onOpen, onRename, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: folder.id, data: { type: "folder" } });
  const dropClass = isOver ? "ring-2 ring-[var(--accent)] bg-[var(--surface-muted)]" : "";

  const actions = isAdmin && (
    <div className="flex gap-1">
      <button
        type="button"
        className={btn.icon}
        title="Renommer"
        aria-label="Renommer le dossier"
        onClick={(e) => {
          e.stopPropagation();
          onRename();
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn.icon}
        title="Supprimer"
        aria-label="Supprimer le dossier"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  if (view === "list") {
    return (
      <div
        ref={setNodeRef}
        className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-muted)] ${dropClass}`}
        onClick={onOpen}
      >
        <Folder className="h-5 w-5 shrink-0 text-[var(--accent)]" />
        <span className="flex-1 truncate text-sm font-medium text-heading">{folder.name}</span>
        <span className="w-24 shrink-0 text-xs text-muted">Dossier</span>
        <span className="w-20 shrink-0 text-xs text-muted">—</span>
        {actions}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} className={`group relative card-theme rounded-xl p-3 ${dropClass}`}>
      <button type="button" onClick={onOpen} className="flex w-full flex-col items-center gap-2 text-center">
        <Folder className="h-10 w-10 text-[var(--accent)]" />
        <span className="w-full truncate text-sm font-medium text-heading" title={folder.name}>
          {folder.name}
        </span>
      </button>
      {isAdmin && <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">{actions}</div>}
    </div>
  );
}
