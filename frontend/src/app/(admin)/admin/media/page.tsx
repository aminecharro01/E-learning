"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, FolderPlus, Home, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  browseMedia,
  uploadAssetToFolder,
  type AssetSummary,
  type BreadcrumbEntry,
  type FolderSummary,
  type MediaBrowseResponse,
} from "@/lib/api";
import { btn } from "@/lib/ui";
import { FolderTile } from "@/components/admin/media/FolderTile";
import { FileTile } from "@/components/admin/media/FileTile";
import { NewFolderDialog } from "@/components/admin/media/NewFolderDialog";
import { RenameFolderDialog } from "@/components/admin/media/RenameFolderDialog";
import { MoveToDialog } from "@/components/admin/media/MoveToDialog";
import { DeleteFolderConfirm } from "@/components/admin/media/DeleteFolderConfirm";
import { DeleteAssetConfirm } from "@/components/admin/media/DeleteAssetConfirm";
import { FilePreviewModal } from "@/components/admin/media/FilePreviewModal";
import { inferKindFromFilename } from "@/components/admin/media/kindIcons";

const KIND_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "VIDEO", label: "Vidéo" },
  { value: "PDF", label: "PDF" },
  { value: "IMAGE", label: "Image" },
  { value: "SLIDE", label: "Diapositive" },
  { value: "DOCUMENT", label: "Document" },
];

export default function AdminMediaPage() {
  const { isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folderId, setFolderId] = useState<string | null>(null);
  const [kind, setKind] = useState("");
  const [data, setData] = useState<MediaBrowseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<{ name: string; percent: number }[]>([]);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<FolderSummary | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderSummary | null>(null);
  const [moveAssetTarget, setMoveAssetTarget] = useState<AssetSummary | null>(null);
  const [deleteAssetTarget, setDeleteAssetTarget] = useState<AssetSummary | null>(null);
  const [previewAsset, setPreviewAsset] = useState<AssetSummary | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    browseMedia(folderId ?? undefined, kind || undefined, 0, 60)
      .then(setData)
      .catch(() => setError("Impossible de charger la bibliothèque de médias."))
      .finally(() => setLoading(false));
  }, [folderId, kind]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    for (const file of list) {
      const fileKind = inferKindFromFilename(file.name);
      setUploading((prev) => [...prev, { name: file.name, percent: 0 }]);
      try {
        await uploadAssetToFolder(file, fileKind, folderId, (percent) => {
          setUploading((prev) => prev.map((u) => (u.name === file.name ? { ...u, percent } : u)));
        });
      } catch {
        setError(`Échec de l'envoi de « ${file.name} ».`);
      } finally {
        setUploading((prev) => prev.filter((u) => u.name !== file.name));
      }
    }
    setMessage("Envoi terminé.");
    load();
  }

  function navigateTo(target: string | null) {
    setFolderId(target);
  }

  return (
    <div
      className="space-y-4"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold text-heading">Médias</h1>
        <p className="mt-1 text-sm text-muted">
          Gestionnaire de fichiers de l&apos;application — dossiers, vidéos (Bunny Stream), PDF, images et documents.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            className="flex items-center gap-1 text-muted hover:text-heading hover:underline"
            onClick={() => navigateTo(null)}
          >
            <Home className="h-4 w-4" /> Racine
          </button>
          {data?.breadcrumbs.map((b: BreadcrumbEntry) => (
            <span key={b.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted" />
              <button type="button" className="text-muted hover:text-heading hover:underline" onClick={() => navigateTo(b.id)}>
                {b.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input-theme text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            aria-label="Filtrer par type"
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {isAdmin && (
            <button type="button" className={btn.neutralSm} onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="h-4 w-4" /> Nouveau dossier
            </button>
          )}
          <button type="button" className={btn.primarySm} onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Téléverser
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error">{error}</p>}
      {uploading.length > 0 && (
        <div className="space-y-1">
          {uploading.map((u) => (
            <div key={u.name} className="flex items-center gap-2 text-xs text-muted">
              <span className="w-40 truncate">{u.name}</span>
              <div className="progress-track h-1.5 flex-1">
                <div className="progress-fill h-full" style={{ width: `${u.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className={`rounded-xl border-2 border-dashed p-3 transition ${
          dragOver ? "border-[var(--accent)] bg-[var(--surface-muted)]" : "border-transparent"
        }`}
      >
        {loading ? (
          <p className="p-6 text-center text-sm text-muted">Chargement…</p>
        ) : !data || (data.childFolders.length === 0 && data.assets.content.length === 0) ? (
          <p className="rounded-xl border border-dashed border-theme p-10 text-center text-sm text-muted">
            Ce dossier est vide — glissez-déposez des fichiers ici ou utilisez le bouton « Téléverser ».
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.childFolders.map((f) => (
              <FolderTile
                key={f.id}
                folder={f}
                isAdmin={isAdmin}
                onOpen={() => navigateTo(f.id)}
                onRename={() => setRenameFolder(f)}
                onDelete={() => setDeleteFolder(f)}
              />
            ))}
            {data.assets.content.map((a) => (
              <FileTile
                key={a.id}
                asset={a}
                isAdmin={isAdmin}
                onOpen={() => setPreviewAsset(a)}
                onMove={() => setMoveAssetTarget(a)}
                onDelete={() => setDeleteAssetTarget(a)}
              />
            ))}
          </div>
        )}
      </div>

      <NewFolderDialog open={newFolderOpen} parentId={folderId} onClose={() => setNewFolderOpen(false)} onCreated={load} />
      <RenameFolderDialog open={!!renameFolder} folder={renameFolder} onClose={() => setRenameFolder(null)} onRenamed={load} />
      <DeleteFolderConfirm open={!!deleteFolder} folder={deleteFolder} onClose={() => setDeleteFolder(null)} onDeleted={load} />
      <MoveToDialog
        open={!!moveAssetTarget}
        assetId={moveAssetTarget?.id ?? null}
        onClose={() => setMoveAssetTarget(null)}
        onMoved={load}
      />
      <DeleteAssetConfirm
        open={!!deleteAssetTarget}
        asset={deleteAssetTarget}
        onClose={() => setDeleteAssetTarget(null)}
        onDeleted={load}
      />
      <FilePreviewModal open={!!previewAsset} asset={previewAsset} onClose={() => setPreviewAsset(null)} />
    </div>
  );
}
