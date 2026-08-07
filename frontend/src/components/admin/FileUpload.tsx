"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Modified: reconnected to Spring Boot API, removed mock data, added role-based rendering

import { useState } from "react";
import apiClient from "@/lib/api-client";

type Kind = "VIDEO" | "PDF" | "IMAGE" | "SLIDE";

type Props = {
  kind?: Kind;
  accept?: string;
  maxSizeMb?: number;
  onUploaded: (asset: { id: string; filename: string; assetKind: string }) => void;
};

const DEFAULT_ACCEPT: Record<Kind, string> = {
  VIDEO: "video/*,.m3u8",
  PDF: "application/pdf",
  IMAGE: "image/*",
  SLIDE: "application/pdf,image/*",
};

const KIND_LABEL: Record<Kind, string> = {
  VIDEO: "Vidéo",
  PDF: "PDF",
  IMAGE: "Image",
  SLIDE: "Diapositive",
};

export function FileUpload({
  kind = "IMAGE",
  accept,
  maxSizeMb = 200,
  onUploaded,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${maxSizeMb} Mo).`);
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const { data } = await apiClient.post<{ id: string; filename: string; assetKind: string }>(
        "/api/assets/upload",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          },
        }
      );
      onUploaded(data);
      setProgress(100);
    } catch {
      setError("Échec du téléversement. Vérifiez le type et la taille du fichier.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload-zone">
      <label className="flex cursor-pointer flex-col gap-2">
        <span className="text-sm font-medium text-heading">
          Téléverser un fichier ({KIND_LABEL[kind]})
        </span>
        <input
          type="file"
          accept={accept || DEFAULT_ACCEPT[kind]}
          disabled={busy}
          className="text-sm text-body"
          onChange={(e) => void onChange(e.target.files?.[0])}
        />
      </label>
      {busy && (
        <div className="progress-track mt-3 h-2">
          <div className="progress-fill h-full" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="alert alert-error mt-2">{error}</p>}
    </div>
  );
}
