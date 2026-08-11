"use client";

import { useDraggable } from "@dnd-kit/core";
import { FolderInput, Trash2 } from "lucide-react";
import type { AssetSummary } from "@/lib/api";
import { AssetImage } from "@/components/AssetImage";
import { btn } from "@/lib/ui";
import { KindIcon, KIND_LABEL, formatFileSize } from "./kindIcons";

type Props = {
  asset: AssetSummary;
  isAdmin: boolean;
  view: "grid" | "list";
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onMove: () => void;
  onDelete: () => void;
};

export function FileTile({ asset, isAdmin, view, selected, onToggleSelect, onOpen, onMove, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: asset.id,
    data: { type: "asset" },
  });
  const dragStyle = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined }
    : undefined;

  const checkbox = isAdmin && (
    <input
      type="checkbox"
      checked={selected}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onChange={onToggleSelect}
      aria-label={`Sélectionner ${asset.filename}`}
      className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
    />
  );

  const actions = isAdmin && (
    <div className="flex gap-1">
      <button
        type="button"
        className={btn.icon}
        title="Déplacer"
        aria-label="Déplacer le fichier"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onMove();
        }}
      >
        <FolderInput className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn.icon}
        title="Supprimer"
        aria-label="Supprimer le fichier"
        onPointerDown={(e) => e.stopPropagation()}
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
        style={dragStyle}
        {...listeners}
        {...attributes}
        className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-muted)] ${
          selected ? "bg-[var(--surface-muted)]" : ""
        }`}
        onClick={onOpen}
      >
        {checkbox}
        <KindIcon kind={asset.assetKind} className="h-5 w-5 shrink-0 text-muted" />
        <span className="flex-1 truncate text-sm font-medium text-heading" title={asset.filename}>
          {asset.filename}
        </span>
        <span className="w-24 shrink-0 text-xs text-muted">{KIND_LABEL[asset.assetKind] ?? asset.assetKind}</span>
        <span className="w-20 shrink-0 text-xs text-muted">{formatFileSize(asset.sizeBytes)}</span>
        {actions}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`group relative card-theme overflow-hidden rounded-xl ${selected ? "ring-2 ring-[var(--accent)]" : ""}`}
    >
      {isAdmin && <div className="absolute left-2 top-2 z-10">{checkbox}</div>}
      <div {...listeners} {...attributes} onClick={onOpen} className="flex w-full cursor-pointer flex-col text-left">
        <div className="flex aspect-square w-full items-center justify-center bg-[var(--surface-muted)]">
          {asset.assetKind === "IMAGE" ? (
            <AssetImage assetId={asset.id} alt={asset.filename} className="h-full w-full object-cover" />
          ) : (
            <KindIcon kind={asset.assetKind} className="h-10 w-10 text-muted" />
          )}
        </div>
        <div className="p-2">
          <p className="truncate text-xs font-medium text-heading" title={asset.filename}>
            {asset.filename}
          </p>
          <p className="text-[11px] text-muted">{formatFileSize(asset.sizeBytes)}</p>
        </div>
      </div>
      {isAdmin && <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">{actions}</div>}
    </div>
  );
}
