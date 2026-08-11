"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { btn, inputClass } from "@/lib/ui";
import { createMediaFolder } from "@/lib/api";

type Props = {
  open: boolean;
  parentId: string | null;
  onClose: () => void;
  onCreated: () => void;
};

export function NewFolderDialog({ open, parentId, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Le nom du dossier est requis.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createMediaFolder(name.trim(), parentId ?? undefined);
      setName("");
      onCreated();
      onClose();
    } catch {
      setError("Échec de la création du dossier.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Nouveau dossier" onClose={onClose}>
      <div className="space-y-3">
        <input
          type="text"
          autoFocus
          className={inputClass}
          placeholder="Nom du dossier"
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
            {busy ? "…" : "Créer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
