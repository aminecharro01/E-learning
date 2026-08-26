"use client";

import { useState } from "react";
import { FileText, Download, Check } from "lucide-react";
import { downloadAsset } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";

type Props = {
  assetId: string;
  title: string;
  required: boolean;
  lessonId: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/** Coursera-style resource row — replaces the inline PDF viewer for learners.
 * Downloading (not just previewing) is what the completion gate checks for. */
export function PdfDownloadBlock({ assetId, title, required, lessonId }: Props) {
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await downloadAsset(assetId, lessonId);
      const absoluteUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
      const link = document.createElement("a");
      link.href = absoluteUrl;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloaded(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Téléchargement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-theme bg-surface-2 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileText size={20} className="shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-heading">{title}</p>
          <span className={`text-xs ${required ? "text-[var(--danger)]" : "text-muted"}`}>
            {required ? "Obligatoire" : "Optionnel"}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {downloaded && <Check size={16} className="text-[var(--success)]" aria-hidden />}
        <button type="button" disabled={busy} onClick={() => void onDownload()} className={btn.secondarySm}>
          <Download size={16} aria-hidden />
          {busy ? "…" : "Télécharger"}
        </button>
      </div>
      {error && <p className="alert alert-error w-full text-xs">{error}</p>}
    </div>
  );
}
