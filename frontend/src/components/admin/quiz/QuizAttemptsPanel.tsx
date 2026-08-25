"use client";

import { useState } from "react";
import { getProctoringEvents, listQuizAttemptsForStaff, type QuizAttemptAdmin } from "@/lib/api";
import type { ProctoringEvent } from "@/types/domain";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/admin/Modal";

type Props = { quizId: string };

const ATTEMPT_STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "En cours",
  SUBMITTED: "Soumis",
  EXPIRED: "Expiré",
  PASSED: "Réussi",
  FAILED: "Échoué",
  PENDING_REVIEW: "En attente de correction",
};

/** Attempts + proctoring-events view for a quiz — fully self-contained (fetches its own
 * data from just a quizId), so the parent renders it with key={quizId} to reset it when the
 * selected quiz changes. Extracted from quiz-bank/page.tsx (was 831 lines). */
export function QuizAttemptsPanel({ quizId }: Props) {
  const [open, setOpen] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttemptAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsAttemptId, setEventsAttemptId] = useState<string | null>(null);
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  async function onToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        setAttempts(await listQuizAttemptsForStaff(quizId));
      } catch {
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    }
  }

  async function onViewEvents(attemptId: string) {
    setEventsAttemptId(attemptId);
    setEventsLoading(true);
    try {
      setEvents(await getProctoringEvents(attemptId));
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }

  return (
    <div className="border-t border-theme pt-4">
      <button
        type="button"
        className="text-sm font-medium text-primary hover:underline"
        onClick={() => void onToggle()}
      >
        {open ? "Masquer les tentatives" : "Voir les tentatives"}
      </button>
      {open && (
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-20 rounded-xl" />
          ) : attempts.length === 0 ? (
            <p className="text-sm text-muted">Aucune tentative pour ce quiz.</p>
          ) : (
            <ul className="space-y-1.5">
              {attempts.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme px-3 py-1.5 text-xs"
                >
                  <span>
                    {a.userFullName} — {ATTEMPT_STATUS_LABEL[a.status] ?? a.status}
                    {a.score !== null && ` — ${a.score}%`}
                  </span>
                  {a.proctoringEventCount > 0 && (
                    <button
                      type="button"
                      className="badge-inline badge-gold"
                      onClick={() => void onViewEvents(a.id)}
                    >
                      {a.proctoringEventCount} évènement(s) anti-triche
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal open={eventsAttemptId !== null} title="Évènements anti-triche" onClose={() => setEventsAttemptId(null)}>
        {eventsLoading ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted">Aucun évènement.</p>
        ) : (
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="rounded-lg border border-theme px-3 py-1.5 text-xs">
                <span className="font-medium text-heading">{e.eventType}</span>
                <span className="ml-2 text-muted">
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" }).format(
                    new Date(e.occurredAt)
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
