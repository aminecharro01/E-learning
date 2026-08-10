"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLesson, markLessonComplete, sendLessonHeartbeat } from "@/lib/api";
import { useCourse } from "@/components/learner/CourseProvider";
import { LessonBlocks } from "@/components/learner/LessonBlocks";
import { LessonQA } from "@/components/learner/LessonQA";
import type { Lesson } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { IconBadge, IconCompass, IconPlane } from "@/components/brand/IatIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { btn } from "@/lib/ui";

function titleWithGrad(text: string) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return text;
  const last = parts.pop()!;
  return (
    <>
      {parts.join(" ")} <span className="grad">{last}</span>
    </>
  );
}

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

  useEffect(() => {
    if (!params.lessonId) return;
    const interval = setInterval(() => {
      void sendLessonHeartbeat(params.lessonId, 15);
    }, 15_000);
    return () => clearInterval(interval);
  }, [params.lessonId]);

  const lessons = useMemo(() => module?.lessons ?? [], [module?.lessons]);
  const idx = useMemo(
    () => lessons.findIndex((l) => l.id === params.lessonId),
    [lessons, params.lessonId]
  );
  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null;
  const moduleQuiz = module?.quizzes.find((q) => q.quizType === "FIN_MODULE" && !q.lessonId);
  const sectionCode = `S-${String(Math.max(idx, 0) + 1).padStart(2, "0")}`;

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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <section className="learn-pass" aria-label="Section en cours">
        <div className="learn-pass-main">
          <span className="bp-eyebrow">
            <IconPlane size={14} />
            Mode lecture
          </span>
          <p className="learn-mod-meta">
            {module?.title ?? "Module"} · Section {idx >= 0 ? idx + 1 : "—"}
            {lessons.length > 0 ? ` / ${lessons.length}` : ""}
          </p>
          <h1 className="learn-pass-title">
            {lesson ? titleWithGrad(lesson.title) : "Chargement…"}
          </h1>
        </div>
        <div className="learn-pass-stub">
          <IconCompass size={22} />
          <span className="course-stub-code">{sectionCode}</span>
        </div>
      </section>

      {error && <p className="alert alert-error mb-4">{error}</p>}

      {lesson && (
        <>
          <div className="learn-content-card">
            <LessonBlocks
              blocks={lesson.blocks || []}
              lessonId={lesson.id}
              onVideoProgress={(p) => {
                if (p >= 90) setLessonCompleted(lesson.id, true);
              }}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-theme pt-6">
            {prev ? (
              <Link href={`/app/learn/${params.moduleId}/s/${prev.id}`} className={btn.secondary}>
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
                <IconPlane size={16} />
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
                  className={btn.secondary}
                >
                  <IconBadge size={16} />
                  Passer le quiz
                </Link>
              )}
            </div>
          </div>

          {params.moduleId && <LessonQA lessonId={lesson.id} moduleId={params.moduleId} />}
        </>
      )}

      {!lesson && !error && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-5 w-2/3 rounded-lg" />
          <Skeleton className="h-5 w-1/2 rounded-lg" />
        </div>
      )}
    </div>
  );
}

export default function LearnSectionPage() {
  return <SectionContent />;
}
