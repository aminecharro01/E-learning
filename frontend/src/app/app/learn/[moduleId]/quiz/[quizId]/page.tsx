"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { QuizTimer } from "@/components/QuizTimer";
import { useCourse } from "@/components/learner/CourseProvider";
import { AssetImage } from "@/components/AssetImage";
import { ApiClientError } from "@/lib/api-client";
import { IconBadge, IconCheck, IconCompass, IconPlane, IconWing } from "@/components/brand/IatIcons";
import { btn } from "@/lib/ui";
import { resolveAssetUrl } from "@/lib/media";

function HotspotClickImage({
  assetId,
  point,
  onPick,
}: {
  assetId: string;
  point?: { x: number; y: number };
  onPick: (x: number, y: number) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveAssetUrl(assetId)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (!url) return <p className="mt-4 text-xs text-muted">Chargement image…</p>;

  return (
    <div className="relative mt-4 inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Zone cliquable"
        className="max-h-96 w-auto cursor-crosshair rounded-lg"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          onPick(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
        }}
      />
      {point && (
        <span
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--primary)] bg-[var(--primary)]/40"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        />
      )}
    </div>
  );
}

type Option = { id: string; label: string; orderIndex: number };
type Question = {
  id: string;
  prompt: string;
  questionType: string;
  orderIndex: number;
  imageAssetId?: string | null;
  options: Option[];
  metadata?: Record<string, unknown> | null;
};

type ProctoringConfig = {
  enabled: boolean;
  focusLossDetection: boolean;
  copyProtection: boolean;
  lockdownMode: boolean;
};

type StartResponse = {
  attemptId: string;
  quizId: string;
  title: string;
  expiresAt: string | null;
  passingScore: number;
  preview?: boolean;
  questions: Question[];
  proctoring?: ProctoringConfig;
};

type SubmitResponse = {
  score: number;
  passingScore: number;
  passed: boolean;
  status: string;
  preview?: boolean;
};

function QuizBody({ moduleId, quizId }: { moduleId: string; quizId: string }) {
  const { reload } = useCourse();
  const [session, setSession] = useState<StartResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [freeTextAnswers, setFreeTextAnswers] = useState<Record<string, string>>({});
  const [structuredAnswers, setStructuredAnswers] = useState<Record<string, unknown>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setResult(null);
    setAnswers({});
    setFreeTextAnswers({});
    setStructuredAnswers({});
    setCurrent(0);
    api
      .post<StartResponse>(`/api/quiz/${quizId}/start`)
      .then((res) => setSession(res.data))
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Impossible de démarrer le quiz.");
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  const submit = useCallback(async () => {
    if (!session) return;
    try {
      const { data } = await api.post<SubmitResponse>(`/api/quiz/${session.quizId}/submit`, {
        attemptId: session.attemptId,
        answers,
        freeTextAnswers,
        structuredAnswers,
      });
      setResult(data);
      // Refresh sidebar statuses / unlocks after attempt
      void reload().catch(() => undefined);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Soumission impossible.");
    }
  }, [session, answers, freeTextAnswers, structuredAnswers, reload]);

  const reportProctoringEvent = useCallback(
    (attemptId: string, eventType: string) => {
      // Best-effort : ne bloque jamais le passage du quiz si le log échoue.
      api.post(`/api/quiz/attempts/${attemptId}/proctoring-events`, { eventType }).catch(() => undefined);
    },
    []
  );

  useEffect(() => {
    if (!session?.proctoring?.enabled || result) return;
    const attemptId = session.attemptId;
    const onVisibility = () => {
      if (document.hidden) reportProctoringEvent(attemptId, "TAB_HIDDEN");
    };
    const onBlur = () => {
      if (session.proctoring?.focusLossDetection) reportProctoringEvent(attemptId, "FOCUS_LOST");
    };
    const onCopy = (e: ClipboardEvent) => {
      if (session.proctoring?.copyProtection) {
        e.preventDefault();
        reportProctoringEvent(attemptId, "COPY_ATTEMPT");
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (session.proctoring?.copyProtection) {
        e.preventDefault();
        reportProctoringEvent(attemptId, "PASTE_ATTEMPT");
      }
    };
    const onContextMenu = (e: MouseEvent) => {
      if (session.proctoring?.copyProtection) e.preventDefault();
    };
    const onFullscreenChange = () => {
      if (session.proctoring?.lockdownMode && !document.fullscreenElement) {
        reportProctoringEvent(attemptId, "FULLSCREEN_EXIT");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    if (session.proctoring?.lockdownMode) {
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [session, result, reportProctoringEvent]);

  function setFreeText(questionId: string, value: string) {
    setFreeTextAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function setMatchingAnswer(questionId: string, leftIndex: number, rightValue: string) {
    setStructuredAnswers((prev) => {
      const existing = (prev[questionId] as Record<string, string>) || {};
      return { ...prev, [questionId]: { ...existing, [String(leftIndex)]: rightValue } };
    });
  }

  function setHotspotAnswer(questionId: string, x: number, y: number) {
    setStructuredAnswers((prev) => ({ ...prev, [questionId]: { x, y } }));
  }

  function toggleAnswer(questionId: string, optionId: string, multi: boolean) {
    setAnswers((prev) => {
      const currentAns = prev[questionId] || [];
      if (multi) {
        return {
          ...prev,
          [questionId]: currentAns.includes(optionId)
            ? currentAns.filter((x) => x !== optionId)
            : [...currentAns, optionId],
        };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  }

  if (loading) {
    return <p className="p-8 text-sm text-muted">Préparation du quiz…</p>;
  }

  if (error && !session) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <p className="alert alert-error">{error}</p>
        <Link href={`/app/learn/${moduleId}`} className={`${btn.primarySm} mt-4 inline-flex items-center gap-2`}>
          <IconPlane size={14} />
          Retour au module
        </Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <section className="learn-result-pass">
          <div className="learn-pass-main">
            <span className="bp-eyebrow">
              <IconBadge size={14} />
              Résultat du vol
            </span>
            <h1 className="learn-pass-title">
              {result.passed ? (
                <>
                  Quiz <span className="grad">réussi</span>
                </>
              ) : (
                <>
                  Quiz <span className="grad">à reprendre</span>
                </>
              )}
            </h1>
            {result.preview && (
              <p className="alert alert-warning mt-3">Mode aperçu staff — tentative non enregistrée.</p>
            )}
            <dl className="bp-meta mt-4">
              <div>
                <dt>Score</dt>
                <dd>{result.score}%</dd>
              </div>
              <div>
                <dt>Minimum</dt>
                <dd>{result.passingScore}%</dd>
              </div>
              <div>
                <dt>Statut</dt>
                <dd>{result.status}</dd>
              </div>
            </dl>
            <div className="bp-actions">
              <Link href={`/app/learn/${moduleId}`} className={btn.primary}>
                <IconPlane size={16} />
                Retour au module
              </Link>
              <Link href="/app" className={btn.secondary}>
                Parcours
              </Link>
            </div>
          </div>
          <div className="learn-pass-stub">
            {result.passed ? <IconCheck size={28} /> : <IconWing size={28} />}
            <span className="course-stub-code">{result.passed ? "PASS" : "RETRY"}</span>
          </div>
        </section>
      </div>
    );
  }

  if (!session) return null;
  const q = session.questions[current];
  const multi = q?.questionType === "MULTI_CHOICE";
  const qCode = `Q-${String(current + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {session.preview && (
        <p className="alert alert-warning mb-4">Mode aperçu (ADMIN / FORMATEUR)</p>
      )}
      {session.proctoring?.enabled && (
        <p className="alert alert-warning mb-4">
          Ce quiz est surveillé : les changements de fenêtre{session.proctoring.copyProtection ? ", le copier-coller" : ""}
          {session.proctoring.lockdownMode ? " et la sortie du plein écran" : ""} sont enregistrés.
        </p>
      )}

      <section className="learn-pass">
        <div className="learn-pass-main">
          <span className="bp-eyebrow">
            <IconBadge size={14} />
            Évaluation
          </span>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="learn-pass-title">{session.title}</h1>
              <p className="learn-mod-meta mt-1">
                Question {current + 1} / {session.questions.length}
              </p>
            </div>
            <QuizTimer expiresAt={session.expiresAt} onExpire={submit} />
          </div>
          <div className="progress-wing mt-4" aria-hidden>
            <div
              style={{
                width: `${((current + 1) / Math.max(session.questions.length, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="learn-pass-stub">
          <IconCompass size={22} />
          <span className="course-stub-code">{qCode}</span>
        </div>
      </section>

      {error && <p className="alert alert-warning mb-4">{error}</p>}

      {q && (
        <section className="learn-content-card">
          <p className="bp-eyebrow !mb-3">
            <IconCompass size={14} />
            {q.questionType === "MULTI_CHOICE"
              ? "Choix multiples"
              : q.questionType === "MATCHING"
                ? "Appariement"
                : q.questionType === "HOTSPOT"
                  ? "Cliquez sur la bonne zone"
                  : q.questionType === "FILL_BLANK"
                    ? "Texte à trous"
                    : q.questionType === "ESSAY"
                      ? "Réponse libre"
                      : "Choix unique"}
          </p>
          <p className="learn-q-prompt">{q.prompt}</p>

          {q.questionType !== "HOTSPOT" && q.imageAssetId && (
            <AssetImage
              assetId={q.imageAssetId}
              alt="Illustration de la question"
              className="mt-4 max-h-72 w-auto rounded-lg"
            />
          )}

          {(q.questionType === "SINGLE_CHOICE" || q.questionType === "MULTI_CHOICE" || q.questionType === "TRUE_FALSE") && (
            <ul className="mt-5 space-y-2.5">
              {q.options.map((opt) => {
                const selected = (answers[q.id] || []).includes(opt.id);
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => toggleAnswer(q.id, opt.id, multi)}
                      className={`learn-option ${selected ? "is-selected" : ""}`}
                    >
                      {opt.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {q.questionType === "MATCHING" && (
            <div className="mt-5 space-y-2.5">
              {((q.metadata?.lefts as string[]) || []).map((left, i) => {
                const rights = (q.metadata?.rights as string[]) || [];
                const chosen = ((structuredAnswers[q.id] as Record<string, string>) || {})[String(i)] || "";
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="learn-option flex-1 !cursor-default">{left}</span>
                    <span className="text-muted">
                      <ArrowRight size={16} aria-hidden />
                    </span>
                    <select
                      className="learn-option flex-1"
                      value={chosen}
                      onChange={(e) => setMatchingAnswer(q.id, i, e.target.value)}
                    >
                      <option value="">— Choisir —</option>
                      {rights.map((r, j) => (
                        <option key={j} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          {q.questionType === "HOTSPOT" && !!q.metadata?.imageAssetId && (
            <HotspotClickImage
              assetId={String(q.metadata.imageAssetId)}
              point={structuredAnswers[q.id] as { x: number; y: number } | undefined}
              onPick={(x, y) => setHotspotAnswer(q.id, x, y)}
            />
          )}

          {q.questionType === "FILL_BLANK" && (
            <div className="mt-5 space-y-2.5">
              <p className="text-sm text-body">{String(q.metadata?.template ?? "")}</p>
              <input
                type="text"
                className="learn-option w-full"
                placeholder="Votre réponse…"
                value={freeTextAnswers[q.id] || ""}
                onChange={(e) => setFreeText(q.id, e.target.value)}
              />
            </div>
          )}

          {q.questionType === "ESSAY" && (
            <textarea
              className="learn-option mt-5 w-full"
              rows={6}
              placeholder="Votre réponse…"
              maxLength={typeof q.metadata?.maxLength === "number" ? q.metadata.maxLength : undefined}
              value={freeTextAnswers[q.id] || ""}
              onChange={(e) => setFreeText(q.id, e.target.value)}
            />
          )}
        </section>
      )}

      <div className="mt-6 flex justify-between gap-3">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => setCurrent((c) => c - 1)}
          className={btn.neutral}
        >
          Précédent
        </button>
        {current < session.questions.length - 1 ? (
          <button type="button" onClick={() => setCurrent((c) => c + 1)} className={btn.primary}>
            Suivant
          </button>
        ) : (
          <button type="button" onClick={() => void submit()} className={btn.primary}>
            <IconBadge size={16} />
            Soumettre
          </button>
        )}
      </div>
    </div>
  );
}

export default function LearnQuizPage() {
  const params = useParams<{ moduleId: string; quizId: string }>();
  return <QuizBody moduleId={params.moduleId} quizId={params.quizId} />;
}
