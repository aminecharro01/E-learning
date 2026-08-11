"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { deleteAsset, type AssetSummary } from "@/lib/api";

type Props = {
  open: boolean;
  assets: AssetSummary[];
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteAssetConfirm({ open, assets, onClose, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (assets.length === 0) return;
    setBusy(true);
    try {
      for (const asset of assets) {
        await deleteAsset(asset.id);
      }
      onDeleted();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const title =
    assets.length > 1 ? `Supprimer ${assets.length} fichiers ?` : `Supprimer « ${assets[0]?.filename ?? ""} » ?`;
  const description =
    assets.length > 1
      ? `Ces ${assets.length} fichiers seront supprimés définitivement (y compris sur Bunny Stream pour les vidéos). S'ils sont utilisés dans des leçons, ils deviendront inaccessibles.`
      : "Ce fichier sera supprimé définitivement (y compris sur Bunny Stream s'il s'agit d'une vidéo). Si ce fichier est utilisé dans une leçon, il deviendra inaccessible.";

  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel="Supprimer définitivement"
      danger
      busy={busy}
      onConfirm={() => void confirmDelete()}
      onClose={onClose}
    />
  );
}
