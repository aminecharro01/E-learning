"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import type { Lesson, ModuleDetail, ModuleLearnerStatus, ModuleQuizItem } from "@/types/domain";
import { IconBadge, IconCheck, IconCompass, IconPlane, IconTower } from "@/components/brand/IatIcons";
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
    <div className="pb-2">
      <ul>
        {lessons.map((lesson, idx) => {
          const active = lesson.id === activeLessonId;
          const quiz = sectionQuizMap.get(lesson.id);
          return (
            <li key={lesson.id}>
              <Link
                href={`/app/learn/${moduleId}/s/${lesson.id}`}
                scroll={false}
                prefetch
                className={`learn-lesson-link ${active ? "is-active" : ""}`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    lesson.completed
                      ? "bg-[var(--alert-success-bg)] text-[var(--success)]"
                      : active
                        ? "bg-[color-mix(in_srgb,var(--gold-500)_22%,transparent)] text-[var(--gold-700)]"
                        : "bg-surface-2 text-muted"
                  }`}
                >
                  {lesson.completed ? <IconCheck size={12} /> : idx + 1}
                </span>
                <span>{lesson.title}</span>
              </Link>
              {quiz && (
                <Link
                  href={`/app/learn/${moduleId}/quiz/${quiz.id}`}
                  scroll={false}
                  prefetch
                  className={`learn-quiz-link ${activeQuizId === quiz.id ? "is-active" : ""}`}
                >
                  <IconBadge size={14} />
                  Quiz · {quiz.title}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {moduleQuizzes.length > 0 && (
        <div className="mt-2 border-t border-theme pt-2">
          <p className="bp-eyebrow !mb-1 px-3 !text-[10px]">
            <IconCompass size={12} />
            Évaluation
          </p>
          <ul>
            {moduleQuizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/app/learn/${moduleId}/quiz/${quiz.id}`}
                  scroll={false}
                  prefetch
                  className={`learn-quiz-link !ml-2 ${activeQuizId === quiz.id ? "is-active" : ""}`}
                >
                  <IconBadge size={14} />
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
      <aside className="learn-sidebar is-collapsed">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`${btn.icon} m-2`}
          aria-label="Ouvrir le sommaire"
          title="Ouvrir le sommaire"
        >
          <IconTower size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="learn-sidebar">
      <div className="learn-sidebar-head">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="bp-eyebrow !mb-1">
              <IconPlane size={14} />
              Unité de formation
            </p>
            <h2 className="learn-mod-title text-[0.9375rem]!">{ufTitle}</h2>
            <p className="learn-mod-meta mt-1">
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

      <nav className="learn-sidebar-nav" aria-label="Sommaire du module">
        <ul>
          {modules.map((mod, index) => {
            const open = expandedIds.has(mod.id);
            const isActive = mod.id === activeModuleId;
            const lessons = mod.detail?.lessons ?? [];
            const quizzes = mod.detail?.quizzes ?? [];
            const done = lessons.filter((l) => l.completed).length;
            const code = `M-${String(index + 1).padStart(2, "0")}`;

            return (
              <li key={mod.id} className={`learn-mod ${isActive ? "is-active" : ""}`}>
                <div className="learn-mod-btn">
                  <button
                    type="button"
                    disabled={mod.locked}
                    onClick={() => toggleModule(mod.id, mod.locked)}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold disabled:cursor-not-allowed"
                    style={{
                      background: mod.learnerStatus === "COMPLETED"
                        ? "var(--alert-success-bg)"
                        : isActive
                          ? "color-mix(in srgb, var(--gold-500) 22%, transparent)"
                          : "var(--surface-2, #f1f5f9)",
                      color: mod.learnerStatus === "COMPLETED"
                        ? "var(--success)"
                        : isActive
                          ? "var(--gold-700)"
                          : "var(--muted-fg, #64748b)",
                    }}
                    aria-expanded={mod.locked ? false : open}
                    aria-label={open ? "Replier le module" : "Déplier le module"}
                  >
                    {mod.locked ? (
                      <Lock size={11} aria-hidden />
                    ) : mod.learnerStatus === "COMPLETED" ? (
                      <IconCheck size={12} />
                    ) : (
                      index + 1
                    )}
                  </button>
                  {mod.locked ? (
                    <span className="min-w-0 flex-1">
                      <span className="learn-mod-title">{mod.title}</span>
                      <span className="learn-mod-meta block">{code} · Verrouillé</span>
                    </span>
                  ) : (
                    <Link
                      href={`/app/learn/${mod.id}`}
                      className="min-w-0 flex-1 rounded-md text-left hover:opacity-90"
                      onClick={() => {
                        if (!open) toggleModule(mod.id, false);
                      }}
                    >
                      <span className="learn-mod-title">{mod.title}</span>
                      <span className="learn-mod-meta block">
                        {code}
                        {" · "}
                        {lessons.length > 0 ? `${done}/${lessons.length}` : "Disponible"}
                      </span>
                    </Link>
                  )}
                  {!mod.locked && (
                    <button
                      type="button"
                      className="mt-0.5 text-muted"
                      aria-label={open ? "Replier" : "Déplier"}
                      onClick={() => toggleModule(mod.id, false)}
                    >
                      {open ? "▾" : "▸"}
                    </button>
                  )}
                </div>

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
