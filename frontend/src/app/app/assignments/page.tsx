"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyProgress, listMyAssignments, submitAssignment, type LearnerAssignment } from "@/lib/api";
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

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<LearnerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
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
        <h1 className="text-2xl font-semibold text-heading">Mes devoirs</h1>
        <p className="mt-1 text-sm text-muted">Dépôts hors quiz, un fichier par devoir (remplace le précédent).</p>
      </div>

      {error && <p className="alert alert-warning mt-3">{error}</p>}

      <div className="mt-5 space-y-3">
        {loading && <p className="text-sm text-muted">Chargement…</p>}
        {!loading && assignments.length === 0 && (
          <p className="text-sm text-muted">Aucun devoir pour le moment.</p>
        )}
        {assignments.map((a) => (
          <section key={a.id} className="card-theme rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{a.moduleTitle}</p>
                <h2 className="mt-0.5 text-lg font-semibold text-heading">{a.title}</h2>
                {a.description && <p className="mt-1 text-sm text-body">{a.description}</p>}
                <p className="mt-2 text-xs text-muted">Échéance : {formatDate(a.dueAt)} — noté sur {a.maxScore}</p>
              </div>
            </div>

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
          </section>
        ))}
      </div>
    </div>
  );
}
