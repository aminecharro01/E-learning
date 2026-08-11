"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { previewDeleteMediaFolder, deleteMediaFolder, type FolderSummary } from "@/lib/api";

type Props = {
  open: boolean;
  folder: FolderSummary | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteFolderConfirm({ open, folder, onClose, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("Chargement…");

  useEffect(() => {
    if (!open || !folder) return;
    setDescription("Chargement…");
    previewDeleteMediaFolder(folder.id)
      .then((preview) => {
        const folderCount = preview.folderCount - 1; // preview includes the folder itself
        setDescription(
          `Ce dossier contient ${folderCount} sous-dossier(s) et ${preview.assetCount} fichier(s). ` +
            `Tout sera supprimé définitivement (y compris les vidéos sur Bunny Stream). ` +
            `Attention : si des fichiers sont utilisés dans des leçons publiées, ils resteront référencés mais deviendront inaccessibles.`
        );
      })
      .catch(() => setDescription("Impossible de calculer le contenu de ce dossier."));
  }, [open, folder]);

  async function confirmDelete() {
    if (!folder) return;
    setBusy(true);
    try {
      await deleteMediaFolder(folder.id);
      onDeleted();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={`Supprimer « ${folder?.name ?? ""} » ?`}
      description={description}
      confirmLabel="Supprimer définitivement"
      danger
      busy={busy}
      onConfirm={() => void confirmDelete()}
      onClose={onClose}
    />
  );
}
