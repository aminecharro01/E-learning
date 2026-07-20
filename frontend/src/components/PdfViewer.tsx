"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  assetId?: string;
  title?: string;
};

export function PdfViewer({ assetId, title }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    api
      .get<{ url: string }>(`/api/assets/${assetId}/stream`)
      .then((res) => {
        const u = res.data.url.startsWith("http") ? res.data.url : `${apiBase}${res.data.url}`;
        setUrl(u);
      })
      .catch(() => setError("Impossible de charger le PDF."));
  }, [assetId]);

  if (error) {
    return <p className="alert alert-error">{error}</p>;
  }

  return (
    <div className="media-viewer">
      {title && <p className="media-viewer-title">{title}</p>}
      {url ? (
        <iframe src={url} title={title || "PDF"} className="h-[70vh] w-full" />
      ) : (
        <p className="p-4 text-sm text-muted">Chargement du document…</p>
      )}
    </div>
  );
}
