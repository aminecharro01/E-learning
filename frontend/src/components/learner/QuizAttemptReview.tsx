"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { getAttemptReview, type AttemptReview } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/Skeleton";

type Props = { attemptId: string };

/** Question-by-question breakdown of a finished quiz attempt — correct answers highlighted
 * green, the learner's own wrong picks in red. Shared between the two quiz-taking pages
 * (learn/[moduleId]/quiz/[quizId] and the standalone /app/quiz/[id]). */
export function QuizAttemptReview({ attemptId }: Props) {
  const [review, setReview] = useState<AttemptReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAttemptReview(attemptId)
      .then((data) => {
        if (!cancelled) setReview(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Impossible de charger le détail.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="mt-4 space-y-2 text-left">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  if (error || !review) {
    return <p className="alert alert-warning mt-4">{error || "Détail indisponible."}</p>;
  }

  return (
    <div className="mt-4 space-y-3 text-left">
      {review.questions.map((q, i) => (
        <div key={q.questionId} className="card-theme rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Question {i + 1}</p>
          <p className="mt-1 text-sm font-medium text-heading">{q.prompt}</p>

          {q.questionType === "ESSAY" ? (
            <div className="mt-3 space-y-2">
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-body">
                {q.freeTextAnswer || <span className="italic text-muted">Aucune réponse.</span>}
              </p>
              {q.essayScore !== null ? (
                <p className="text-sm">
                  Note : <strong className="text-heading">{q.essayScore}%</strong>
                  {q.essayFeedback && <span className="block text-muted">{q.essayFeedback}</span>}
                </p>
              ) : (
                <p className="text-xs text-muted">En attente de correction.</p>
              )}
            </div>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {q.options.map((o) => {
                const isCorrect = o.correct;
                const isWrongSelection = o.selected && !o.correct;
                return (
                  <li
                    key={o.optionId}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      isCorrect
                        ? "border-[var(--success)] bg-[var(--alert-success-bg)] text-[var(--alert-success-fg)]"
                        : isWrongSelection
                          ? "border-[var(--danger)] bg-[var(--alert-error-bg)] text-[var(--alert-error-fg)]"
                          : "border-theme text-body"
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 size={16} aria-hidden />
                    ) : isWrongSelection ? (
                      <XCircle size={16} aria-hidden />
                    ) : (
                      <span className="size-4 shrink-0" aria-hidden />
                    )}
                    {o.label}
                  </li>
                );
              })}
            </ul>
          )}

          {q.explanation && (
            <p className="mt-2 text-xs text-muted">
              <span className="font-semibold">Explication : </span>
              {q.explanation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
