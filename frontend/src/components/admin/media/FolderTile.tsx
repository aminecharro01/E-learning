"use client";

import { Folder, Pencil, Trash2 } from "lucide-react";
import type { FolderSummary } from "@/lib/api";
import { btn } from "@/lib/ui";

type Props = {
  folder: FolderSummary;
  isAdmin: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export function FolderTile({ folder, isAdmin, onOpen, onRename, onDelete }: Props) {
  return (
    <div className="group relative card-theme rounded-xl p-3">
      <button type="button" onClick={onOpen} className="flex w-full flex-col items-center gap-2 text-center">
        <Folder className="h-10 w-10 text-[var(--accent)]" />
        <span className="w-full truncate text-sm font-medium text-heading" title={folder.name}>
          {folder.name}
        </span>
      </button>
      {isAdmin && (
        <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
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
      )}
    </div>
  );
}
