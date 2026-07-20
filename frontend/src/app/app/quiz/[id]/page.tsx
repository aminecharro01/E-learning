"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { QuizTimer } from "@/components/QuizTimer";
import { AssetImage } from "@/components/AssetImage";
import { btn } from "@/lib/ui";

type Option = { id: string; label: string; orderIndex: number };
type Question = {
  id: string;
  prompt: string;
  questionType: string;
  orderIndex: number;
  imageAssetId?: string | null;
  options: Option[];
};

type StartResponse = {
  attemptId: string;
  quizId: string;
  title: string;
  expiresAt: string | null;
  passingScore: number;
  preview?: boolean;
  questions: Question[];
};

type SubmitResponse = {
  score: number;
  passingScore: number;
  passed: boolean;
  status: string;
  preview?: boolean;
};

export default function QuizTakingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<StartResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    api
      .post<StartResponse>(`/api/quiz/${params.id}/start`)
      .then((res) => setSession(res.data))
      .catch((err) => {
        setError(err?.response?.data?.error || "Impossible de démarrer le quiz.");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const submit = useCallback(async () => {
    if (!session) return;
    try {
      const { data } = await api.post<SubmitResponse>(`/api/quiz/${session.quizId}/submit`, {
        attemptId: session.attemptId,
        answers,
      });
      setResult(data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response;
      if (status?.status === 410) {
        setError("Temps écoulé — tentative expirée.");
      } else {
        setError(status?.data?.error || "Soumission impossible.");
      }
    }
  }, [session, answers]);

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
    return <main className="p-8 text-sm text-muted">Préparation du quiz…</main>;
  }

  if (error && !session) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p className="alert alert-error">{error}</p>
        <button type="button" onClick={() => router.back()} className={`${btn.neutralSm} mt-4`}>
          Retour
        </button>
      </main>
    );
  }

  if (result) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold text-heading">Résultat</h1>
        {result.preview && (
          <p className="alert alert-warning mt-3">
            Mode aperçu staff — tentative non enregistrée, hors progression apprenant.
          </p>
        )}
        <p className="mt-4 text-lg text-body">
          Score : <strong className="text-heading">{result.score}%</strong> (minimum {result.passingScore}%)
        </p>
        <p
          className={`mt-2 font-medium ${result.passed ? "text-[var(--alert-success-fg)]" : "text-[var(--alert-error-fg)]"}`}
        >
          {result.passed ? "Réussi" : "Échoué"} — {result.status}
        </p>
        <Link href="/app" className={`${btn.primarySm} mt-6 inline-block`}>
          Retour au tableau de bord
        </Link>
      </main>
    );
  }

  if (!session) return null;
  const q = session.questions[current];
  const multi = q?.questionType === "MULTI_CHOICE";

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-8">
      {session.preview && (
        <p className="alert alert-warning mb-4">
          Mode aperçu (ADMIN / FORMATEUR) — les réponses ne créent pas de tentative réelle.
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-heading">{session.title}</h1>
          <p className="text-sm text-muted">
            Question {current + 1} / {session.questions.length}
          </p>
        </div>
        <QuizTimer expiresAt={session.expiresAt} onExpire={submit} />
      </div>

      {error && <p className="alert alert-warning mt-4">{error}</p>}

      {q && (
        <section className="card-theme mt-8 rounded-2xl p-6">
          <p className="text-lg text-heading">{q.prompt}</p>
          {q.imageAssetId && (
            <AssetImage
              assetId={q.imageAssetId}
              alt="Illustration de la question"
              className="mt-4 max-h-72 w-auto rounded-lg"
            />
          )}
          <ul className="mt-4 space-y-2">
            {q.options.map((opt) => {
              const selected = (answers[q.id] || []).includes(opt.id);
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => toggleAnswer(q.id, opt.id, multi)}
                    className={`nav-item w-full rounded-lg border border-theme px-4 py-3 text-left text-sm ${
                      selected ? "nav-item-active" : ""
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-6 flex justify-between">
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
          <button type="button" onClick={() => void submit()} className={btn.success}>
            Soumettre
          </button>
        )}
      </div>
    </main>
  );
}
