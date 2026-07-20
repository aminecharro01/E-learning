"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLesson, markLessonComplete } from "@/lib/api";
import { CourseProvider, useCourse } from "@/components/learner/CourseProvider";
import { LessonBlocks } from "@/components/learner/LessonBlocks";
import type { Lesson } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";

function SectionContent() {
  const params = useParams<{ moduleId: string; lessonId: string }>();
  const router = useRouter();
  const { module, setLessonCompleted } = useCourse();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!params.lessonId) return;
    setLesson(null);
    getLesson(params.lessonId)
      .then(setLesson)
      .catch((err) =>
        setError(err instanceof ApiClientError ? err.message : "Impossible de charger la section.")
      );
  }, [params.lessonId]);

  const lessons = useMemo(() => module?.lessons ?? [], [module?.lessons]);
  const idx = useMemo(
    () => lessons.findIndex((l) => l.id === params.lessonId),
    [lessons, params.lessonId]
  );
  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null;
  const moduleQuiz = module?.quizzes.find((q) => q.quizType === "FIN_MODULE" && !q.lessonId);

  const goNext = useCallback(() => {
    if (next) {
      router.push(`/app/learn/${params.moduleId}/s/${next.id}`);
    } else if (moduleQuiz) {
      router.push(`/app/learn/${params.moduleId}/quiz/${moduleQuiz.id}`);
    }
  }, [next, moduleQuiz, params.moduleId, router]);

  async function onComplete() {
    if (!params.lessonId) return;
    setBusy(true);
    try {
      await markLessonComplete(params.lessonId);
      setLessonCompleted(params.lessonId, true);
      goNext();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de marquer comme terminé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <p className="text-xs text-muted">
        <Link href="/app" className="hover:text-heading hover:underline">
          Formation
        </Link>
        {" · "}
        <span>{module?.title}</span>
        {" · "}
        <span className="text-body">Section {idx >= 0 ? idx + 1 : "—"}</span>
      </p>

      {error && <p className="alert alert-error mt-4">{error}</p>}

      {lesson && (
        <>
          <h1 className="mt-4 text-2xl font-semibold text-heading">{lesson.title}</h1>
          <div className="mt-8">
            <LessonBlocks
              blocks={lesson.blocks || []}
              lessonId={lesson.id}
              onVideoProgress={(p) => {
                if (p >= 90) setLessonCompleted(lesson.id, true);
              }}
            />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-theme pt-6">
            {prev ? (
              <Link
                href={`/app/learn/${params.moduleId}/s/${prev.id}`}
                className={btn.secondary}
              >
                ← {prev.title}
              </Link>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void onComplete()}
                className={btn.primary}
              >
                {busy ? "…" : next || moduleQuiz ? "Terminer et continuer" : "Marquer terminé"}
              </button>
              {next && (
                <button type="button" onClick={goNext} className={btn.neutral}>
                  Suivant →
                </button>
              )}
              {!next && moduleQuiz && (
                <Link
                  href={`/app/learn/${params.moduleId}/quiz/${moduleQuiz.id}`}
                  className={btn.warning}
                >
                  Passer le quiz →
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {!lesson && !error && (
        <p className="mt-8 text-sm text-muted">Chargement du contenu…</p>
      )}
    </div>
  );
}

export default function LearnSectionPage() {
  const params = useParams<{ moduleId: string; lessonId: string }>();
  return (
    <CourseProvider moduleId={params.moduleId} activeLessonId={params.lessonId}>
      <SectionContent />
    </CourseProvider>
  );
}
