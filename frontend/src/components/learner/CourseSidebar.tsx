"use client";

import Link from "next/link";
import type { Lesson, ModuleQuizItem } from "@/types/domain";
import { btn } from "@/lib/ui";

type Props = {
  moduleId: string;
  moduleTitle: string;
  lessons: Lesson[];
  quizzes: ModuleQuizItem[];
  activeLessonId?: string;
  activeQuizId?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function CourseSidebar({
  moduleId,
  moduleTitle,
  lessons,
  quizzes,
  activeLessonId,
  activeQuizId,
  collapsed,
  onToggleCollapse,
}: Props) {
  const completedCount = lessons.filter((l) => l.completed).length;
  const percent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const moduleQuizzes = quizzes.filter((q) => !q.lessonId || q.quizType === "FIN_MODULE");
  const sectionQuizMap = new Map(
    quizzes.filter((q) => q.lessonId).map((q) => [q.lessonId!, q])
  );

  if (collapsed) {
    return (
      <aside className="app-sidebar flex w-12 shrink-0 flex-col">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`${btn.neutralSm} m-2`}
          aria-label="Ouvrir le sommaire"
          title="Ouvrir le sommaire"
        >
          ☰
        </button>
      </aside>
    );
  }

  return (
    <aside className="app-sidebar flex w-72 shrink-0 flex-col">
      <div className="border-b border-theme px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="eyebrow">Module</p>
            <h2 className="mt-0.5 truncate text-sm font-semibold text-heading">{moduleTitle}</h2>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={btn.neutralXs}
              aria-label="Masquer le sommaire"
            >
              «
            </button>
          )}
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-muted">
            <span>
              {completedCount}/{lessons.length} sections
            </span>
            <span>{percent}%</span>
          </div>
          <div className="progress-track h-1.5">
            <div className="progress-fill h-full" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="nav-group-label mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide">
          Contenu
        </p>
        <ul className="space-y-0.5">
          {lessons.map((lesson, idx) => {
            const active = lesson.id === activeLessonId;
            const quiz = sectionQuizMap.get(lesson.id);
            return (
              <li key={lesson.id}>
                <Link
                  href={`/app/learn/${moduleId}/s/${lesson.id}`}
                  className={`nav-item flex items-start gap-2.5 px-2.5 py-2 text-sm ${
                    active ? "nav-item-active font-medium" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      lesson.completed
                        ? "bg-success text-[var(--success-fg)]"
                        : active
                          ? "bg-primary text-[var(--primary-fg)]"
                          : "bg-surface-2 text-muted"
                    }`}
                  >
                    {lesson.completed ? "✓" : idx + 1}
                  </span>
                  <span className="leading-snug">{lesson.title}</span>
                </Link>
                {quiz && (
                  <Link
                    href={`/app/learn/${moduleId}/quiz/${quiz.id}`}
                    className={`nav-item ml-7 mt-0.5 block rounded-md px-2 py-1.5 text-xs ${
                      activeQuizId === quiz.id ? "nav-item-active font-medium" : ""
                    }`}
                  >
                    Quiz · {quiz.title}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {moduleQuizzes.length > 0 && (
          <div className="mt-4 border-t border-theme pt-3">
            <p className="nav-group-label mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide">
              Évaluation
            </p>
            <ul className="space-y-0.5">
              {moduleQuizzes.map((quiz) => (
                <li key={quiz.id}>
                  <Link
                    href={`/app/learn/${moduleId}/quiz/${quiz.id}`}
                    className={`nav-item flex items-center gap-2 px-2.5 py-2 text-sm ${
                      activeQuizId === quiz.id ? "nav-item-active font-medium" : ""
                    }`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-[var(--warning-fg)]">
                      Q
                    </span>
                    {quiz.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="border-t border-theme p-3">
        <Link href="/app" className="nav-item block rounded-lg px-2.5 py-2 text-xs">
          ← Tableau de bord
        </Link>
      </div>
    </aside>
  );
}
