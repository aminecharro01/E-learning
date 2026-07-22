"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getModule, getMyProgress } from "@/lib/api";
import type { ModuleDetail, ModuleLearnerStatus } from "@/types/domain";
import { CourseSidebar, type UfSidebarModule } from "@/components/learner/CourseSidebar";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { ApiClientError } from "@/lib/api-client";

type CourseContextValue = {
  module: ModuleDetail | null;
  reload: () => Promise<void>;
  setLessonCompleted: (lessonId: string, completed: boolean) => void;
};

const CourseContext = createContext<CourseContextValue | null>(null);

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within CourseProvider");
  return ctx;
}

type ProviderProps = {
  moduleId: string;
  activeLessonId?: string;
  activeQuizId?: string;
  children: React.ReactNode;
};

function normalizeDetail(data: ModuleDetail): ModuleDetail {
  return {
    ...data,
    lessons: data.lessons || [],
    quizzes: data.quizzes || [],
  };
}

export function CourseProvider({
  moduleId,
  activeLessonId,
  activeQuizId,
  children,
}: ProviderProps) {
  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [ufTitle, setUfTitle] = useState("Unité de formation");
  const [ufModules, setUfModules] = useState<UfSidebarModule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const reload = useCallback(async () => {
    const [progress, currentDetail] = await Promise.all([getMyProgress(), getModule(moduleId)]);
    const current = normalizeDetail(currentDetail);
    setModule(current);

    const summary = progress.modules.find((m) => m.id === moduleId);
    const ufCode = summary?.ufCode ?? current.ufCode ?? null;
    const title = summary?.ufTitle ?? current.ufTitle ?? "Unité de formation";
    setUfTitle(title);

    const siblings = progress.modules
      .filter((m) => (ufCode ? m.ufCode === ufCode : m.id === moduleId))
      .toSorted((a, b) => a.orderIndex - b.orderIndex);

    const details = await Promise.all(
      siblings.map(async (s) => {
        const status = (s.learnerStatus ?? "LOCKED") as ModuleLearnerStatus;
        const locked = status === "LOCKED";
        if (locked) {
          return {
            id: s.id,
            title: s.title,
            learnerStatus: status,
            orderIndex: s.orderIndex,
            locked: true,
            detail: null,
          } satisfies UfSidebarModule;
        }
        if (s.id === moduleId) {
          return {
            id: s.id,
            title: s.title,
            learnerStatus: status,
            orderIndex: s.orderIndex,
            locked: false,
            detail: current,
          } satisfies UfSidebarModule;
        }
        try {
          const detail = normalizeDetail(await getModule(s.id));
          return {
            id: s.id,
            title: s.title,
            learnerStatus: status,
            orderIndex: s.orderIndex,
            locked: false,
            detail,
          } satisfies UfSidebarModule;
        } catch {
          return {
            id: s.id,
            title: s.title,
            learnerStatus: status,
            orderIndex: s.orderIndex,
            locked: true,
            detail: null,
          } satisfies UfSidebarModule;
        }
      })
    );

    setUfModules(details);
  }, [moduleId]);

  useEffect(() => {
    setError(null);
    reload().catch((err) => {
      if (err instanceof ApiClientError && err.status === 403) {
        setError("Module verrouillé. Validez le module précédent.");
      } else {
        setError("Impossible de charger le module.");
      }
    });
  }, [reload]);

  const setLessonCompleted = useCallback((lessonId: string, completed: boolean) => {
    const patch = (detail: ModuleDetail | null) => {
      if (!detail) return detail;
      return {
        ...detail,
        lessons: detail.lessons.map((l) => (l.id === lessonId ? { ...l, completed } : l)),
      };
    };

    setModule((prev) => patch(prev));
    setUfModules((prev) =>
      prev.map((m) => (m.detail ? { ...m, detail: patch(m.detail) } : m))
    );
  }, []);

  const value = useMemo(
    () => ({ module, reload, setLessonCompleted }),
    [module, reload, setLessonCompleted]
  );

  return (
    <CourseContext.Provider value={value}>
      <div className="flex h-screen flex-col">
        <LearnerAppHeader containerClassName="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6" />

        <div className="flex min-h-0 flex-1">
          {ufModules.length > 0 && (
            <CourseSidebar
              ufTitle={ufTitle}
              modules={ufModules}
              activeModuleId={moduleId}
              activeLessonId={activeLessonId}
              activeQuizId={activeQuizId}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed((v) => !v)}
            />
          )}
          <main className="min-w-0 flex-1 overflow-y-auto">
            {error && <p className="alert alert-error m-6">{error}</p>}
            {!error && children}
          </main>
        </div>
      </div>
    </CourseContext.Provider>
  );
}
