"use client";

import { useCallback, useEffect, useState } from "react";
import { getCommentModerationQueue, unhideLessonComment } from "@/lib/api";
import { DataTable, type DataTableColumn, type PageMeta } from "@/components/admin/DataTable";
import { useAuth } from "@/hooks/useAuth";
import type { LessonComment } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";
import { toast } from "@/lib/toast-store";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminForumModerationPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<LessonComment[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCommentModerationQueue(p, 20);
      setRows(data.content);
      setSelectedIds([]);
      setPageMeta({
        page: data.page,
        size: data.size,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de charger les discussions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load(0);
  }, [isAdmin, load]);

  if (!isAdmin) {
    return <p className="text-sm text-muted">Réservé aux administrateurs.</p>;
  }

  async function onUnhide(id: string) {
    try {
      await unhideLessonComment(id);
      toast.success("Message réaffiché.");
      setRows((r) => r.filter((c) => c.id !== id));
      setSelectedIds((ids) => ids.filter((x) => x !== id));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action impossible.");
    }
  }

  async function onBulkUnhide() {
    setBulkBusy(true);
    const ids = [...selectedIds];
    let succeeded = 0;
    for (const id of ids) {
      try {
        await unhideLessonComment(id);
        succeeded++;
      } catch {
        // on continue les autres même si l'une échoue — le compte final le reflète
      }
    }
    setRows((r) => r.filter((c) => !ids.includes(c.id)));
    setSelectedIds([]);
    setBulkBusy(false);
    if (succeeded === ids.length) {
      toast.success(`${succeeded} message(s) réaffiché(s).`);
    } else {
      toast.error(`${succeeded}/${ids.length} réaffiché(s) — réessayez pour le reste.`);
    }
  }

  const columns: DataTableColumn<LessonComment>[] = [
    { key: "date", header: "Date", render: (r) => formatDate(r.createdAt) },
    { key: "author", header: "Auteur", render: (r) => r.authorName },
    { key: "target", header: "Cible", render: (r) => (r.lessonId ? "Section" : "Module") },
    { key: "body", header: "Message", render: (r) => <span className="line-clamp-2">{r.body}</span> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button type="button" className={btn.secondaryXs} onClick={() => void onUnhide(r.id)}>
          Réafficher
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Modération des forums</h1>
        <p className="mt-1 text-sm text-muted">
          Messages masqués sur l&apos;ensemble des forums de leçon et de module — sélectionnez plusieurs lignes
          pour les réafficher en une seule action.
        </p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="Aucun message masqué."
        pageMeta={pageMeta}
        onPageChange={(p) => void load(p)}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={
          <button type="button" className={btn.primarySm} disabled={bulkBusy} onClick={() => void onBulkUnhide()}>
            {bulkBusy ? "Réaffichage…" : "Réafficher la sélection"}
          </button>
        }
      />
    </div>
  );
}
