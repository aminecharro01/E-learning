"use client";

import { FolderInput, Trash2 } from "lucide-react";
import type { AssetSummary } from "@/lib/api";
import { AssetImage } from "@/components/AssetImage";
import { btn } from "@/lib/ui";
import { KindIcon, formatFileSize } from "./kindIcons";

type Props = {
  asset: AssetSummary;
  isAdmin: boolean;
  onOpen: () => void;
  onMove: () => void;
  onDelete: () => void;
};

export function FileTile({ asset, isAdmin, onOpen, onMove, onDelete }: Props) {
  return (
    <div className="group relative card-theme overflow-hidden rounded-xl">
      <button type="button" onClick={onOpen} className="flex w-full flex-col text-left">
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
      </button>
      {isAdmin && (
        <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
          <button
            type="button"
            className={btn.icon}
            title="Déplacer"
            aria-label="Déplacer le fichier"
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
