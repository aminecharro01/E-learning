"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { deleteAsset, type AssetSummary } from "@/lib/api";

type Props = {
  open: boolean;
  asset: AssetSummary | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteAssetConfirm({ open, asset, onClose, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (!asset) return;
    setBusy(true);
    try {
      await deleteAsset(asset.id);
      onDeleted();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={`Supprimer « ${asset?.filename ?? ""} » ?`}
      description="Ce fichier sera supprimé définitivement (y compris sur Bunny Stream s'il s'agit d'une vidéo). Si ce fichier est utilisé dans une leçon, il deviendra inaccessible."
      confirmLabel="Supprimer définitivement"
      danger
      busy={busy}
      onConfirm={() => void confirmDelete()}
      onClose={onClose}
    />
  );
}
