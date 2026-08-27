"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronRight,
  FolderInput,
  FolderPlus,
  Home,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  browseMedia,
  moveAsset,
  uploadAssetToFolder,
  type AssetSummary,
  type BreadcrumbEntry,
  type FolderSummary,
  type MediaBrowseResponse,
} from "@/lib/api";
import { btn } from "@/lib/ui";
import { FolderTile } from "@/components/admin/media/FolderTile";
import { FileTile } from "@/components/admin/media/FileTile";
import { BreadcrumbCrumb } from "@/components/admin/media/BreadcrumbCrumb";
import { NewFolderDialog } from "@/components/admin/media/NewFolderDialog";
import { RenameFolderDialog } from "@/components/admin/media/RenameFolderDialog";
import { MoveToDialog } from "@/components/admin/media/MoveToDialog";
import { DeleteFolderConfirm } from "@/components/admin/media/DeleteFolderConfirm";
import { DeleteAssetConfirm } from "@/components/admin/media/DeleteAssetConfirm";
import { FilePreviewModal } from "@/components/admin/media/FilePreviewModal";
import { inferKindFromFilename, formatFileSize } from "@/components/admin/media/kindIcons";

const KIND_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "VIDEO", label: "Vidéos" },
  { value: "DOCUMENTS", label: "Documents" },
  { value: "IMAGE", label: "Images" },
];

// "Documents" groups Word/Docs, PDF and PowerPoint/PPT into one filter option -
// the backend's browse endpoint only matches a single exact kind, so this group
// is applied client-side over the unfiltered listing (see load()/documentAssets below).
const DOCUMENT_KINDS = new Set(["PDF", "DOCUMENT", "SLIDE"]);

const ROOT_DROP_ID = "__root__";
type SortKey = "name" | "size";

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

  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<FolderSummary | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderSummary | null>(null);
  const [moveAssets, setMoveAssets] = useState<AssetSummary[]>([]);
  const [deleteAssets, setDeleteAssets] = useState<AssetSummary[]>([]);
  const [previewAsset, setPreviewAsset] = useState<AssetSummary | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    const stored = localStorage.getItem("admin-media-view");
    if (stored === "grid" || stored === "list") setView(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem("admin-media-view", view);
  }, [view]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    // The synthetic "DOCUMENTS" group has no single backend kind to match, so it
    // fetches everything and the grouping filter is applied client-side below.
    const backendKind = kind === "DOCUMENTS" ? undefined : kind || undefined;
    browseMedia(folderId ?? undefined, backendKind, 0, 60)
      .then((res) => {
        setData(res);
        setSelectedIds(new Set());
      })
      .catch(() => setError("Impossible de charger la bibliothèque de médias."))
      .finally(() => setLoading(false));
  }, [folderId, kind]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedFolders = useMemo(() => {
    if (!data) return [];
    return [...data.childFolders].sort((a, b) => a.name.localeCompare(b.name) * (sortDir === "asc" ? 1 : -1));
  }, [data, sortDir]);

  const sortedAssets = useMemo(() => {
    if (!data) return [];
    const factor = sortDir === "asc" ? 1 : -1;
    const filtered =
      kind === "DOCUMENTS" ? data.assets.content.filter((a) => DOCUMENT_KINDS.has(a.assetKind)) : data.assets.content;
    return [...filtered].sort((a, b) => {
      if (sortKey === "size") return (a.sizeBytes - b.sizeBytes) * factor;
      return a.filename.localeCompare(b.filename) * factor;
    });
  }, [data, kind, sortKey, sortDir]);

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedAssets = sortedAssets.filter((a) => selectedIds.has(a.id));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "asset") return;
    const targetFolderId = over.id === ROOT_DROP_ID ? null : String(over.id);
    try {
      await moveAsset(String(active.id), targetFolderId);
      setMessage("Fichier déplacé.");
      load();
    } catch {
      setError("Échec du déplacement.");
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={(e) => void handleDragEnd(e)}>
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
            <BreadcrumbCrumb id={ROOT_DROP_ID} onClick={() => navigateTo(null)}>
              <Home className="h-4 w-4" /> Racine
            </BreadcrumbCrumb>
            {data?.breadcrumbs.map((b: BreadcrumbEntry) => (
              <span key={b.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted" />
                <BreadcrumbCrumb id={b.id} onClick={() => navigateTo(b.id)}>
                  {b.name}
                </BreadcrumbCrumb>
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
            <select
              className="input-theme text-sm"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Trier par"
            >
              <option value="name">Nom</option>
              <option value="size">Taille</option>
            </select>
            <button
              type="button"
              className={btn.icon}
              title={sortDir === "asc" ? "Ordre croissant" : "Ordre décroissant"}
              aria-label="Inverser l'ordre de tri"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            >
              {sortDir === "asc" ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
            </button>
            <div className="flex overflow-hidden rounded-lg border border-theme">
              <button
                type="button"
                className={`p-1.5 ${view === "grid" ? "bg-[var(--surface-2)]" : ""}`}
                title="Vue grille"
                aria-label="Vue grille"
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`p-1.5 ${view === "list" ? "bg-[var(--surface-2)]" : ""}`}
                title="Vue liste"
                aria-label="Vue liste"
                onClick={() => setView("list")}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
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

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-theme bg-[var(--surface-2)] px-4 py-2">
            <span className="text-sm font-medium text-heading">{selectedIds.size} sélectionné(s)</span>
            <div className="flex gap-2">
              <button type="button" className={btn.neutralSm} onClick={() => setMoveAssets(selectedAssets)}>
                <FolderInput className="h-4 w-4" /> Déplacer
              </button>
              <button type="button" className={btn.dangerSm} onClick={() => setDeleteAssets(selectedAssets)}>
                <Trash2 className="h-4 w-4" /> Supprimer
              </button>
              <button type="button" className={btn.neutralSm} onClick={() => setSelectedIds(new Set())}>
                Annuler
              </button>
            </div>
          </div>
        )}

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
            dragOver ? "border-[var(--ring)] bg-[var(--surface-2)]" : "border-transparent"
          }`}
        >
          {loading ? (
            <p className="p-6 text-center text-sm text-muted">Chargement…</p>
          ) : !data || (sortedFolders.length === 0 && sortedAssets.length === 0) ? (
            <p className="rounded-xl border border-dashed border-theme p-10 text-center text-sm text-muted">
              Ce dossier est vide — glissez-déposez des fichiers ici ou utilisez le bouton « Téléverser ».
            </p>
          ) : view === "list" ? (
            <div className="space-y-0.5">
              {sortedFolders.map((f) => (
                <FolderTile
                  key={f.id}
                  folder={f}
                  isAdmin={isAdmin}
                  view="list"
                  onOpen={() => navigateTo(f.id)}
                  onRename={() => setRenameFolder(f)}
                  onDelete={() => setDeleteFolder(f)}
                />
              ))}
              {sortedAssets.map((a) => (
                <FileTile
                  key={a.id}
                  asset={a}
                  isAdmin={isAdmin}
                  view="list"
                  selected={selectedIds.has(a.id)}
                  onToggleSelect={() => toggleSelect(a.id)}
                  onOpen={() => setPreviewAsset(a)}
                  onMove={() => setMoveAssets([a])}
                  onDelete={() => setDeleteAssets([a])}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {sortedFolders.map((f) => (
                <FolderTile
                  key={f.id}
                  folder={f}
                  isAdmin={isAdmin}
                  view="grid"
                  onOpen={() => navigateTo(f.id)}
                  onRename={() => setRenameFolder(f)}
                  onDelete={() => setDeleteFolder(f)}
                />
              ))}
              {sortedAssets.map((a) => (
                <FileTile
                  key={a.id}
                  asset={a}
                  isAdmin={isAdmin}
                  view="grid"
                  selected={selectedIds.has(a.id)}
                  onToggleSelect={() => toggleSelect(a.id)}
                  onOpen={() => setPreviewAsset(a)}
                  onMove={() => setMoveAssets([a])}
                  onDelete={() => setDeleteAssets([a])}
                />
              ))}
            </div>
          )}
        </div>

        {data && (sortedFolders.length > 0 || sortedAssets.length > 0) && (
          <p className="text-xs text-muted">
            {sortedFolders.length} dossier(s) · {sortedAssets.length} fichier(s) ·{" "}
            {formatFileSize(sortedAssets.reduce((sum, a) => sum + a.sizeBytes, 0))}
          </p>
        )}

        <NewFolderDialog open={newFolderOpen} parentId={folderId} onClose={() => setNewFolderOpen(false)} onCreated={load} />
        <RenameFolderDialog open={!!renameFolder} folder={renameFolder} onClose={() => setRenameFolder(null)} onRenamed={load} />
        <DeleteFolderConfirm open={!!deleteFolder} folder={deleteFolder} onClose={() => setDeleteFolder(null)} onDeleted={load} />
        <MoveToDialog
          open={moveAssets.length > 0}
          assetIds={moveAssets.map((a) => a.id)}
          onClose={() => setMoveAssets([])}
          onMoved={load}
        />
        <DeleteAssetConfirm
          open={deleteAssets.length > 0}
          assets={deleteAssets}
          onClose={() => setDeleteAssets([])}
          onDeleted={load}
        />
        <FilePreviewModal open={!!previewAsset} asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      </div>
    </DndContext>
  );
}
