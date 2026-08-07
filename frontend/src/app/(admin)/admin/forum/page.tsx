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

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCommentModerationQueue(p, 20);
      setRows(data.content);
      setPageMeta({
        page: data.page,
        size: data.size,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Chargement impossible.");
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
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action impossible.");
    }
  }

  const columns: DataTableColumn<LessonComment>[] = [
    { key: "date", header: "Date", render: (r) => formatDate(r.createdAt) },
    { key: "author", header: "Auteur", render: (r) => r.authorName },
    { key: "target", header: "Cible", render: (r) => (r.lessonId ? "Leçon" : "Module") },
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
          Messages masqués sur l&apos;ensemble des forums de leçon et de module.
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
      />
    </div>
  );
}
