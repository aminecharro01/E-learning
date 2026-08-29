"use client";

import { useCallback, useEffect, useState } from "react";
import { gradeEssay, getPendingReviewAttempts } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { AccessLocked } from "@/components/admin/ui/AccessLocked";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/toast-store";
import { btn, inputClass } from "@/lib/ui";
import { ApiClientError } from "@/lib/api-client";

type PendingAttempt = Awaited<ReturnType<typeof getPendingReviewAttempts>>[number];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminGradingPage() {
  const { hasRole } = useAuth();
  const canGrade = hasRole("SUPER_ADMIN", "ADMIN", "FORMATEUR");
  const [attempts, setAttempts] = useState<PendingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAttempts(await getPendingReviewAttempts());
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de charger la file de correction.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canGrade) return;
    void load();
  }, [canGrade, load]);

  if (!canGrade) {
    return <AccessLocked reason="Réservé au Directeur, au Formateur et au Super Admin." />;
  }

  async function onGrade(attemptId: string, questionId: string) {
    const key = `${attemptId}:${questionId}`;
    const score = Number(scores[key]);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      toast.error("Note invalide (0 à 100).");
      return;
    }
    setBusy(true);
    try {
      await gradeEssay(attemptId, questionId, score, feedbacks[key] || undefined);
      toast.success("Question corrigée.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Correction impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Correction manuelle</h1>
        <p className="mt-1 text-sm text-muted">
          Questions ouvertes en attente de correction — le score final du quiz se calcule
          automatiquement dès que toutes les questions ouvertes d&apos;une tentative sont notées.
        </p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {loading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : attempts.length === 0 ? (
        <ComponentCard title="Rien à corriger" desc="Aucune tentative en attente">
          <p className="text-sm text-muted">Toutes les questions ouvertes ont été corrigées.</p>
        </ComponentCard>
      ) : (
        <div className="space-y-4">
          {attempts.map((a) => (
            <ComponentCard
              key={a.attemptId}
              title={`${a.userFullName} — ${a.quizTitle}`}
              desc={`Soumis le ${formatDate(a.submittedAt)}`}
            >
              <div className="space-y-4">
                {a.essayAnswers.map((ans) => {
                  const key = `${a.attemptId}:${ans.questionId}`;
                  return (
                    <div key={ans.questionId} className="rounded-xl border border-theme p-3">
                      <p className="text-sm font-medium text-heading">{ans.prompt}</p>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-2 p-2 text-sm text-body">
                        {ans.submittedText || <em className="text-muted">Aucune réponse soumise</em>}
                      </p>
                      {ans.graded ? (
                        <p className="mt-2 alert alert-success text-xs">
                          Déjà corrigée — {ans.score}%{ans.feedback ? ` — ${ans.feedback}` : ""}
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="Note /100"
                            className={`${inputClass} w-28`}
                            value={scores[key] || ""}
                            onChange={(e) => setScores((s) => ({ ...s, [key]: e.target.value }))}
                          />
                          <input
                            placeholder="Commentaire (optionnel)"
                            className={`${inputClass} flex-1`}
                            value={feedbacks[key] || ""}
                            onChange={(e) => setFeedbacks((f) => ({ ...f, [key]: e.target.value }))}
                          />
                          <button
                            type="button"
                            disabled={busy}
                            className={btn.primarySm}
                            onClick={() => void onGrade(a.attemptId, ans.questionId)}
                          >
                            Valider
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ComponentCard>
          ))}
        </div>
      )}
    </div>
  );
}
