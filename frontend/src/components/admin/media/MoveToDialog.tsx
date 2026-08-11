"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Folder, Home } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { btn } from "@/lib/ui";
import { browseMedia, moveAsset, type FolderSummary, type BreadcrumbEntry } from "@/lib/api";

type Props = {
  open: boolean;
  assetId: string | null;
  onClose: () => void;
  onMoved: () => void;
};

export function MoveToDialog({ open, assetId, onClose, onMoved }: Props) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);
  const [childFolders, setChildFolders] = useState<FolderSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFolderId(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    browseMedia(folderId ?? undefined, undefined, 0, 1)
      .then((res) => {
        setBreadcrumbs(res.breadcrumbs);
        setChildFolders(res.childFolders);
      })
      .catch(() => setError("Impossible de charger les dossiers."));
  }, [open, folderId]);

  async function confirmMove() {
    if (!assetId) return;
    setBusy(true);
    setError(null);
    try {
      await moveAsset(assetId, folderId);
      onMoved();
      onClose();
    } catch {
      setError("Échec du déplacement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Déplacer vers…" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1 text-sm text-muted">
          <button type="button" className="flex items-center gap-1 hover:underline" onClick={() => setFolderId(null)}>
            <Home className="h-3.5 w-3.5" /> Racine
          </button>
          {breadcrumbs.map((b) => (
            <span key={b.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <button type="button" className="hover:underline" onClick={() => setFolderId(b.id)}>
                {b.name}
              </button>
            </span>
          ))}
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-theme p-2">
          {childFolders.length === 0 ? (
            <p className="p-2 text-sm text-muted">Aucun sous-dossier.</p>
          ) : (
            childFolders.map((f) => (
              <button
                key={f.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-muted)]"
                onClick={() => setFolderId(f.id)}
              >
                <Folder className="h-4 w-4 text-[var(--accent)]" />
                {f.name}
              </button>
            ))
          )}
        </div>

        {error && <p className="alert alert-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn.neutral} onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button type="button" className={btn.primary} onClick={() => void confirmMove()} disabled={busy}>
            {busy ? "…" : "Déplacer ici"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
