"use client";

import { useEffect, useState } from "react";
import { listAssets, type AssetSummary } from "@/lib/api";
import { Modal } from "@/components/admin/Modal";
import { AssetImage } from "@/components/AssetImage";
import { btn } from "@/lib/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: AssetSummary) => void;
};

/**
 * Bibliothèque de médias déjà uploadés — évite de re-uploader la même image pour
 * chaque question/bloc. Ne liste que les médias partagés (jamais les documents
 * privés), filtré côté backend.
 */
export function AssetPicker({ open, onClose, onSelect }: Props) {
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listAssets("IMAGE", page, 24)
      .then((res) => {
        setAssets(res.content);
        setTotalPages(res.totalPages);
      })
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, [open, page]);

  return (
    <Modal open={open} title="Choisir une image existante" onClose={onClose}>
      {loading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : assets.length === 0 ? (
        <p className="text-sm text-muted">Aucune image déjà envoyée.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                className="group overflow-hidden rounded-lg border border-theme text-left transition hover:ring-2 hover:ring-[var(--ring)]"
                onClick={() => {
                  onSelect(a);
                  onClose();
                }}
                title={a.filename}
              >
                <AssetImage assetId={a.id} alt={a.filename} className="aspect-square w-full object-cover" />
                <span className="block truncate px-1.5 py-1 text-[10px] text-muted">{a.filename}</span>
              </button>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-3 flex justify-between">
              <button type="button" className={btn.neutralXs} disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </button>
              <button
                type="button"
                className={btn.neutralXs}
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
