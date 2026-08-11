"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { btn, inputClass } from "@/lib/ui";
import { renameMediaFolder, type FolderSummary } from "@/lib/api";

type Props = {
  open: boolean;
  folder: FolderSummary | null;
  onClose: () => void;
  onRenamed: () => void;
};

export function RenameFolderDialog({ open, folder, onClose, onRenamed }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && folder) setName(folder.name);
  }, [open, folder]);

  async function submit() {
    if (!folder || !name.trim()) {
      setError("Le nom du dossier est requis.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await renameMediaFolder(folder.id, name.trim());
      onRenamed();
      onClose();
    } catch {
      setError("Échec du renommage.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Renommer le dossier" onClose={onClose}>
      <div className="space-y-3">
        <input
          type="text"
          autoFocus
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
        {error && <p className="alert alert-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn.neutral} onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button type="button" className={btn.primary} onClick={() => void submit()} disabled={busy}>
            {busy ? "…" : "Renommer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
