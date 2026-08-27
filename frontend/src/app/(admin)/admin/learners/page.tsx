"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import {
  getLearnerProgress,
  listLearners,
  type LearnerProgressDetail,
  type LearnerSummary,
} from "@/lib/api";
import { DataTable, type DataTableColumn, type PageMeta } from "@/components/admin/DataTable";
import { Modal } from "@/components/admin/Modal";
import { Badge } from "@/components/admin/ui/Badge";
import { ApiClientError } from "@/lib/api-client";

const statusFr: Record<string, string> = {
  LOCKED: "Verrouillé",
  AVAILABLE: "Disponible",
  IN_PROGRESS: "En cours",
  COMPLETED: "Validé",
};

function initialsOf(fullName: string | null, email: string) {
  const source = fullName?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

// Not .progress-track/.progress-fill: those classes are scoped to .app-horizon
// (the learner shell layout only, see app-horizon.css) and render invisibly
// anywhere in the admin shell — built inline instead with tokens that work here.
function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export default function AdminLearnersPage() {
  const [rows, setRows] = useState<LearnerSummary[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LearnerProgressDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
      setError(err instanceof ApiClientError ? err.message : "Impossible de charger les apprenants.");
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

  function openDetail(row: LearnerSummary) {
    setDetailLoading(true);
    setError(null);
    getLearnerProgress(row.id)
      .then(setDetail)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Détail impossible."))
      .finally(() => setDetailLoading(false));
  }

  const columns: DataTableColumn<LearnerSummary>[] = [
    {
      key: "name",
      header: "Apprenant",
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-primary">
            {initialsOf(r.fullName, r.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-heading">{r.fullName || "—"}</p>
            <p className="truncate text-xs text-muted">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "progress",
      header: "Progression",
      render: (r) => (
        <div className="flex items-center gap-2">
          <ProgressBar percent={r.completionPercent} />
          <span className="whitespace-nowrap text-xs text-muted">
            {r.completionPercent}% · {r.completedModules}/{r.totalModules}
          </span>
        </div>
      ),
    },
    {
      key: "enabled",
      header: "Compte",
      render: (r) => (
        <Badge size="sm" color={r.enabled ? "success" : "error"}>
          {r.enabled ? "Actif" : "Désactivé"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Apprenants</h1>
        <p className="mt-1 text-sm text-muted">
          Suivi de progression (ADMIN & FORMATEUR) — lecture seule. Cliquez sur une ligne pour le détail par module.
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
        onRowClick={openDetail}
      />

      <Modal
        open={detailLoading || !!detail}
        title={detail ? detail.fullName || detail.email : "Détail apprenant"}
        onClose={() => setDetail(null)}
        size="lg"
      >
        {detailLoading && !detail ? (
          <p className="py-8 text-center text-sm text-muted">Chargement…</p>
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl bg-surface-2 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-[var(--primary-fg)]">
                {initialsOf(detail.fullName, detail.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted">{detail.formationTitle}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ProgressBar percent={detail.completionPercent} />
                  <span className="text-sm font-semibold text-heading">{detail.completionPercent}%</span>
                </div>
              </div>
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
                                l.completed ? "font-medium text-[var(--alert-success-fg)]" : "opacity-60"
                              }
                            >
                              {l.completed ? <CheckCircle2 size={14} aria-hidden /> : <Circle size={14} aria-hidden />}
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
        ) : null}
      </Modal>
    </div>
  );
}
