"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  getMyBulletin,
  getMyProgress,
  listMyAssignments,
  submitAssignment,
  type LearnerAssignment,
  type LearnerBulletin,
} from "@/lib/api";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";
import { toast } from "@/lib/toast-store";

function formatDate(iso: string | null) {
  if (!iso) return "Sans échéance";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Déposé — en attente de correction",
  LATE: "Déposé en retard — en attente de correction",
  GRADED: "Corrigé",
};

type Tab = "devoirs" | "notes";

export default function AssignmentsPage() {
  const [tab, setTab] = useState<Tab>("devoirs");
  const [assignments, setAssignments] = useState<LearnerAssignment[]>([]);
  const [bulletin, setBulletin] = useState<LearnerBulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulletinLoading, setBulletinLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const progress = await getMyProgress();
    const perModule = await Promise.all(
      progress.modules.map((m) => listMyAssignments(m.id).catch(() => []))
    );
    const flat = perModule.flat().sort((a, b) => {
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
    setAssignments(flat);
  }, []);

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger les devoirs."))
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (tab !== "notes" || bulletin) return;
    setBulletinLoading(true);
    getMyBulletin()
      .then(setBulletin)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger le bulletin."))
      .finally(() => setBulletinLoading(false));
  }, [tab, bulletin]);

  const groupedAssignments = useMemo(() => {
    const groups = new Map<string, { moduleTitle: string; items: LearnerAssignment[] }>();
    for (const a of assignments) {
      const g = groups.get(a.moduleId) ?? { moduleTitle: a.moduleTitle, items: [] };
      g.items.push(a);
      groups.set(a.moduleId, g);
    }
    return Array.from(groups.values());
  }, [assignments]);

  async function onUpload(assignmentId: string, file: File | undefined) {
    if (!file) return;
    setUploadingId(assignmentId);
    try {
      await submitAssignment(assignmentId, file);
      await reload();
      toast.success("Devoir déposé.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Envoi impossible.");
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <LearnerAppHeader showParcoursLink />
      <div className="mt-4">
        <h1 className="text-2xl font-semibold text-heading">Devoirs & notes</h1>
        <p className="mt-1 text-sm text-muted">Vos dépôts de devoirs et votre bulletin de notes.</p>
      </div>

      <div className="mt-4 flex gap-1 border-b border-theme">
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "devoirs" ? "border-primary text-primary" : "border-transparent text-muted hover:text-heading"
          }`}
          onClick={() => setTab("devoirs")}
        >
          Mes devoirs
        </button>
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "notes" ? "border-primary text-primary" : "border-transparent text-muted hover:text-heading"
          }`}
          onClick={() => setTab("notes")}
        >
          Mes notes
        </button>
      </div>

      {error && <p className="alert alert-warning mt-4">{error}</p>}

      {tab === "devoirs" ? (
        <div className="mt-5 space-y-6">
          {loading && <p className="text-sm text-muted">Chargement…</p>}
          {!loading && assignments.length === 0 && (
            <p className="text-sm text-muted">Aucun devoir pour le moment.</p>
          )}
          {groupedAssignments.map((group) => (
            <section key={group.moduleTitle}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.moduleTitle}</h2>
              <div className="space-y-3">
                {group.items.map((a) => (
                  <div key={a.id} className="card-theme rounded-2xl p-5">
                    <h3 className="text-lg font-semibold text-heading">{a.title}</h3>
                    {a.description && <p className="mt-1 text-sm text-body">{a.description}</p>}
                    <p className="mt-2 text-xs text-muted">
                      Échéance : {formatDate(a.dueAt)} — noté sur {a.maxScore}
                    </p>

                    {a.mySubmission ? (
                      <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
                        <span
                          className={`badge-inline ${
                            a.mySubmission.status === "GRADED"
                              ? "badge-success"
                              : a.mySubmission.status === "LATE"
                                ? "badge-alert"
                                : "badge-gold"
                          }`}
                        >
                          {STATUS_LABEL[a.mySubmission.status] || a.mySubmission.status}
                        </span>
                        {a.mySubmission.status === "GRADED" && (
                          <p className="mt-1">
                            Note : <strong>{a.mySubmission.grade}</strong> / {a.maxScore}
                            {a.mySubmission.feedback && <span className="block text-muted">{a.mySubmission.feedback}</span>}
                          </p>
                        )}
                        <label className={`${btn.secondarySm} mt-2 inline-flex cursor-pointer`}>
                          {uploadingId === a.id ? "Envoi…" : "Redéposer un fichier"}
                          <input
                            type="file"
                            className="hidden"
                            disabled={uploadingId === a.id}
                            onChange={(e) => void onUpload(a.id, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className={`${btn.primarySm} mt-3 inline-flex cursor-pointer`}>
                        {uploadingId === a.id ? "Envoi…" : "Déposer un fichier"}
                        <input
                          type="file"
                          className="hidden"
                          disabled={uploadingId === a.id}
                          onChange={(e) => void onUpload(a.id, e.target.files?.[0])}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <BulletinView bulletin={bulletin} loading={bulletinLoading} />
      )}
    </div>
  );
}

function BulletinView({ bulletin, loading }: { bulletin: LearnerBulletin | null; loading: boolean }) {
  if (loading && !bulletin) {
    return <p className="mt-5 text-sm text-muted">Chargement du bulletin…</p>;
  }
  if (!bulletin || bulletin.modules.length === 0) {
    return (
      <p className="mt-5 rounded-xl border border-dashed border-theme p-8 text-center text-sm text-muted">
        Aucune note disponible pour le moment — le bulletin se remplit au fur et à mesure des quiz et devoirs corrigés.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-6">
      <div className="card-theme flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
        <div>
          <p className="text-sm text-muted">Bulletin de notes</p>
          <p className="text-lg font-semibold text-heading">{bulletin.studentName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted">Moyenne générale</p>
          <p
            className={`text-3xl font-bold ${
              bulletin.overallAverage != null && bulletin.overallAverage >= 50
                ? "text-[var(--alert-success-fg)]"
                : "text-[var(--danger)]"
            }`}
          >
            {bulletin.overallAverage != null ? `${bulletin.overallAverage}%` : "—"}
          </p>
        </div>
      </div>

      {bulletin.modules.map((m) => (
        <section key={m.moduleId} className="card-theme overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-theme bg-surface-2 px-5 py-3">
            <h2 className="font-medium text-heading">{m.moduleTitle}</h2>
            <span className="text-sm font-semibold text-heading">
              Moyenne : {m.average != null ? `${m.average}%` : "—"}
              {m.bonus !== 0 && (
                <span className="ml-1 text-xs font-normal text-muted">
                  (dont {m.bonus > 0 ? "+" : ""}
                  {m.bonus} bonus)
                </span>
              )}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-2 font-medium">Évaluation</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 text-right font-medium">Note</th>
                <th className="px-5 py-2 text-right font-medium">Résultat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {m.evaluations.map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-2.5 text-body">{e.label}</td>
                  <td className="px-5 py-2.5 text-xs text-muted">
                    {e.type === "QUIZ" ? "Quiz" : "Devoir"}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium text-heading">
                    {e.score} / {e.maxScore}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {e.passed === true && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--alert-success-fg)]">
                        <CheckCircle2 size={14} aria-hidden /> Réussi
                      </span>
                    )}
                    {e.passed === false && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--danger)]">
                        <XCircle size={14} aria-hidden /> Échoué
                      </span>
                    )}
                    {e.passed === null && <span className="text-xs text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
