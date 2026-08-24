"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getModule, getMyProgress, getUfQuiz, type UfQuizItem } from "@/lib/api";
import type { ModuleDetail, ModuleLearnerStatus } from "@/types/domain";
import { CourseSidebar, type UfSidebarModule } from "@/components/learner/CourseSidebar";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { ApiClientError } from "@/lib/api-client";

type CourseContextValue = {
  module: ModuleDetail | null;
  moduleId: string | null;
  reload: () => Promise<void>;
  setLessonCompleted: (lessonId: string, completed: boolean) => void;
};

const CourseContext = createContext<CourseContextValue | null>(null);

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within CourseProvider");
  return ctx;
}

function normalizeDetail(data: ModuleDetail): ModuleDetail {
  return {
    ...data,
    lessons: data.lessons || [],
    quizzes: data.quizzes || [],
  };
}

/** Parse /app/learn/:moduleId[/s|:quiz/:id] without remounting the shell. */
export function parseLearnPath(pathname: string): {
  moduleId: string | null;
  activeLessonId?: string;
  activeQuizId?: string;
} {
  const parts = pathname.split("/").filter(Boolean);
  const learnIdx = parts.indexOf("learn");
  if (learnIdx < 0 || !parts[learnIdx + 1]) {
    return { moduleId: null };
  }
  const moduleId = parts[learnIdx + 1];
  const kind = parts[learnIdx + 2];
  const itemId = parts[learnIdx + 3];
  if (kind === "s" && itemId) return { moduleId, activeLessonId: itemId };
  if (kind === "quiz" && itemId) return { moduleId, activeQuizId: itemId };
  return { moduleId };
}

async function loadUfBundle(targetModuleId: string): Promise<{
  current: ModuleDetail;
  ufTitle: string;
  details: UfSidebarModule[];
  ufQuiz: UfQuizItem | null;
}> {
  const [progress, currentDetail] = await Promise.all([
    getMyProgress(),
    getModule(targetModuleId),
  ]);
  const current = normalizeDetail(currentDetail);

  const summary = progress.modules.find((m) => m.id === targetModuleId);
  const ufCode = summary?.ufCode ?? current.ufCode ?? null;
  const ufTitle = summary?.ufTitle ?? current.ufTitle ?? "Unité de formation";
  const ufQuiz = ufCode ? await getUfQuiz(ufCode).catch(() => null) : null;

  const siblings = progress.modules
    .filter((m) => (ufCode ? m.ufCode === ufCode : m.id === targetModuleId))
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
      if (s.id === targetModuleId) {
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

  return { current, ufTitle, details, ufQuiz };
}

type ProviderProps = {
  children: React.ReactNode;
};

export function CourseProvider({ children }: ProviderProps) {
  const pathname = usePathname();
  const { moduleId, activeLessonId, activeQuizId } = useMemo(
    () => parseLearnPath(pathname),
    [pathname]
  );

  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [ufTitle, setUfTitle] = useState("Unité de formation");
  const [ufModules, setUfModules] = useState<UfSidebarModule[]>([]);
  const [ufQuiz, setUfQuiz] = useState<UfQuizItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const ufModulesRef = useRef(ufModules);
  ufModulesRef.current = ufModules;

  const applyBundle = useCallback(
    (bundle: Awaited<ReturnType<typeof loadUfBundle>>) => {
      setModule(bundle.current);
      setUfTitle(bundle.ufTitle);
      setUfModules(bundle.details);
      setUfQuiz(bundle.ufQuiz);
      setError(null);
    },
    []
  );

  const reload = useCallback(async () => {
    if (!moduleId) return;
    applyBundle(await loadUfBundle(moduleId));
  }, [moduleId, applyBundle]);

  // Keep shell mounted: load UF once, then switch module from cache when possible.
  useEffect(() => {
    if (!moduleId) return;

    const cached = ufModulesRef.current.find((m) => m.id === moduleId);
    if (cached?.detail) {
      setModule(cached.detail);
      setError(null);
      return;
    }

    let cancelled = false;
    const targetId = moduleId;

    loadUfBundle(targetId)
      .then((bundle) => {
        if (cancelled) return;
        applyBundle(bundle);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 403) {
          setError("Module verrouillé. Validez le module précédent.");
        } else {
          setError("Impossible de charger le module.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [moduleId, applyBundle]);

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
    () => ({ module, moduleId, reload, setLessonCompleted }),
    [module, moduleId, reload, setLessonCompleted]
  );

  return (
    <CourseContext.Provider value={value}>
      <div className="iat-board flex h-screen flex-col">
        <LearnerAppHeader containerClassName="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6" />

        <div className="learn-shell">
          {ufModules.length > 0 && moduleId && (
            <CourseSidebar
              ufTitle={ufTitle}
              modules={ufModules}
              ufQuiz={ufQuiz}
              activeModuleId={moduleId}
              activeLessonId={activeLessonId}
              activeQuizId={activeQuizId}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed((v) => !v)}
            />
          )}
          <main className="learn-main">
            {error && <p className="alert alert-error m-6">{error}</p>}
            {!error && children}
          </main>
        </div>
      </div>
    </CourseContext.Provider>
  );
}
