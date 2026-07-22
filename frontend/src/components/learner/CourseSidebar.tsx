"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lesson, ModuleDetail, ModuleLearnerStatus, ModuleQuizItem } from "@/types/domain";
import { btn } from "@/lib/ui";

export type UfSidebarModule = {
  id: string;
  title: string;
  learnerStatus: ModuleLearnerStatus;
  orderIndex: number;
  locked: boolean;
  detail: ModuleDetail | null;
};

type Props = {
  ufTitle: string;
  modules: UfSidebarModule[];
  activeModuleId: string;
  activeLessonId?: string;
  activeQuizId?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

function ModuleLessons({
  moduleId,
  lessons,
  quizzes,
  activeLessonId,
  activeQuizId,
}: {
  moduleId: string;
  lessons: Lesson[];
  quizzes: ModuleQuizItem[];
  activeLessonId?: string;
  activeQuizId?: string;
}) {
  const moduleQuizzes = quizzes.filter((q) => !q.lessonId || q.quizType === "FIN_MODULE");
  const sectionQuizMap = new Map(
    quizzes.filter((q) => q.lessonId).map((q) => [q.lessonId!, q])
  );

  return (
    <div className="pb-2 pl-2">
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
        <div className="mt-2 border-t border-theme pt-2">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
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
    </div>
  );
}

export function CourseSidebar({
  ufTitle,
  modules,
  activeModuleId,
  activeLessonId,
  activeQuizId,
  collapsed,
  onToggleCollapse,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set([activeModuleId]));

  useEffect(() => {
    setExpandedIds((prev) => {
      if (prev.has(activeModuleId)) return prev;
      const next = new Set(prev);
      next.add(activeModuleId);
      return next;
    });
  }, [activeModuleId]);

  function toggleModule(id: string, locked: boolean) {
    if (locked) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
            <p className="eyebrow">Unité de formation</p>
            <h2 className="mt-0.5 text-sm font-semibold leading-snug text-heading">{ufTitle}</h2>
            <p className="mt-1 text-[11px] text-muted">
              {modules.length} module{modules.length > 1 ? "s" : ""}
            </p>
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
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {modules.map((mod, index) => {
            const open = expandedIds.has(mod.id);
            const isActive = mod.id === activeModuleId;
            const lessons = mod.detail?.lessons ?? [];
            const quizzes = mod.detail?.quizzes ?? [];
            const done = lessons.filter((l) => l.completed).length;

            return (
              <li
                key={mod.id}
                className={`overflow-hidden rounded-lg border ${
                  isActive ? "border-primary/40 bg-surface" : "border-transparent"
                }`}
              >
                <button
                  type="button"
                  disabled={mod.locked}
                  onClick={() => toggleModule(mod.id, mod.locked)}
                  className={`flex w-full items-start gap-2 px-2.5 py-2.5 text-left text-sm ${
                    mod.locked ? "cursor-not-allowed opacity-60" : "hover:bg-surface-2/70"
                  }`}
                  aria-expanded={mod.locked ? false : open}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      mod.learnerStatus === "COMPLETED"
                        ? "bg-success text-[var(--success-fg)]"
                        : isActive
                          ? "bg-primary text-[var(--primary-fg)]"
                          : "bg-surface-2 text-muted"
                    }`}
                  >
                    {mod.locked ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-7-2a2 2 0 0 1 4 0v2h-4V6zm7 14H7V10h10v10z" />
                      </svg>
                    ) : mod.learnerStatus === "COMPLETED" ? (
                      "✓"
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug text-heading">{mod.title}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {mod.locked
                        ? "Verrouillé"
                        : lessons.length > 0
                          ? `${done}/${lessons.length} sections`
                          : "Disponible"}
                    </span>
                  </span>
                  {!mod.locked && (
                    <span className="mt-0.5 text-muted" aria-hidden>
                      {open ? "▾" : "▸"}
                    </span>
                  )}
                </button>

                {open && !mod.locked && mod.detail && (
                  <ModuleLessons
                    moduleId={mod.id}
                    lessons={lessons}
                    quizzes={quizzes}
                    activeLessonId={isActive ? activeLessonId : undefined}
                    activeQuizId={isActive ? activeQuizId : undefined}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
