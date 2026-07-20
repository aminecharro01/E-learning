"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getLearnerProgress,
  listLearners,
  type LearnerProgressDetail,
  type LearnerSummary,
} from "@/lib/api";
import { DataTable, type DataTableColumn, type PageMeta } from "@/components/admin/DataTable";
import { ApiClientError } from "@/lib/api-client";

const statusFr: Record<string, string> = {
  LOCKED: "Verrouillé",
  AVAILABLE: "Disponible",
  IN_PROGRESS: "En cours",
  COMPLETED: "Validé",
};

export default function AdminLearnersPage() {
  const [rows, setRows] = useState<LearnerSummary[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LearnerProgressDetail | null>(null);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const data = await listLearners(p, 10, q || undefined);
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
    void load(0, "");
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      void load(0, search.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const columns: DataTableColumn<LearnerSummary>[] = [
    { key: "name", header: "Nom", render: (r) => r.fullName || "—" },
    { key: "email", header: "Email", render: (r) => r.email },
    {
      key: "progress",
      header: "Progression",
      render: (r) => `${r.completionPercent}% (${r.completedModules}/${r.totalModules})`,
    },
    {
      key: "enabled",
      header: "Compte",
      render: (r) => (r.enabled ? "Actif" : "Désactivé"),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Apprenants</h1>
        <p className="mt-1 text-sm text-muted">
          Suivi de progression (ADMIN & FORMATEUR) — lecture seule
        </p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher email ou nom…"
        pageMeta={pageMeta}
        onPageChange={(p) => {
          void load(p, query);
        }}
        onRowClick={(row) => {
          void getLearnerProgress(row.id)
            .then(setDetail)
            .catch((err) =>
              setError(err instanceof ApiClientError ? err.message : "Détail impossible.")
            );
        }}
      />

      {detail && (
        <div className="card-theme rounded-2xl p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium text-heading">{detail.fullName || detail.email}</h2>
              <p className="text-sm text-muted">
                {detail.formationTitle} — {detail.completionPercent}%
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-muted underline hover:text-heading"
              onClick={() => setDetail(null)}
            >
              Fermer
            </button>
          </div>
          <ul className="space-y-3">
            {detail.modules.map((m) => {
              const done = m.lessons?.filter((l) => l.completed).length ?? 0;
              const total = m.lessons?.length ?? 0;
              return (
                <li key={m.moduleId} className="card-theme rounded-xl px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-heading">{m.title}</span>
                    <span className="text-xs text-muted">
                      {statusFr[m.status] || m.status}
                      {total > 0 ? ` · ${done}/${total} sections` : ""}
                    </span>
                  </div>
                  {m.lessons && m.lessons.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-theme pt-2">
                      {m.lessons.map((l) => (
                        <li
                          key={l.lessonId}
                          className="flex items-center justify-between gap-2 text-xs text-muted"
                        >
                          <span className="truncate">
                            {l.orderIndex + 1}. {l.title}
                            {!l.published && <span className="ml-1 opacity-70">(brouillon)</span>}
                          </span>
                          <span
                            className={
                              l.completed
                                ? "font-medium text-[var(--alert-success-fg)]"
                                : "opacity-60"
                            }
                          >
                            {l.completed ? "✓" : "○"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
