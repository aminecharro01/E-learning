"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { VideoPlayer } from "@/components/VideoPlayer";
import { PdfViewer } from "@/components/PdfViewer";
import { AssetImage } from "@/components/AssetImage";
import { api, type AssetSummary } from "@/lib/api";
import { btn } from "@/lib/ui";

type Props = {
  open: boolean;
  asset: AssetSummary | null;
  onClose: () => void;
};

export function FilePreviewModal({ open, asset, onClose }: Props) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const needsDownloadLink = asset && asset.assetKind !== "VIDEO" && asset.assetKind !== "PDF" && asset.assetKind !== "IMAGE";

  useEffect(() => {
    if (!open || !asset || !needsDownloadLink) {
      setDownloadUrl(null);
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    api
      .get<{ url: string }>(`/api/assets/${asset.id}/stream`)
      .then((res) => setDownloadUrl(res.data.url.startsWith("http") ? res.data.url : `${apiBase}${res.data.url}`))
      .catch(() => setDownloadUrl(null));
  }, [open, asset, needsDownloadLink]);

  if (!asset) return null;

  return (
    <Modal open={open} title={asset.filename} onClose={onClose} size="lg">
      {asset.assetKind === "VIDEO" && <VideoPlayer assetId={asset.id} title={asset.filename} />}
      {asset.assetKind === "PDF" && <PdfViewer assetId={asset.id} title={asset.filename} />}
      {asset.assetKind === "IMAGE" && (
        <AssetImage assetId={asset.id} alt={asset.filename} className="max-h-[70vh] w-full rounded-lg object-contain" />
      )}
      {needsDownloadLink && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-muted">Aperçu non disponible pour ce type de fichier.</p>
          {downloadUrl ? (
            <a href={downloadUrl} className={btn.primary} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" /> Télécharger
            </a>
          ) : (
            <p className="text-sm text-muted">Préparation du lien…</p>
          )}
        </div>
      )}
    </Modal>
  );
}
