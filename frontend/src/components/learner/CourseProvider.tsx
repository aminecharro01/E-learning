"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getModule } from "@/lib/api";
import type { ModuleDetail } from "@/types/domain";
import { CourseSidebar } from "@/components/learner/CourseSidebar";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
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

export function CourseProvider({
  moduleId,
  activeLessonId,
  activeQuizId,
  children,
}: ProviderProps) {
  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const reload = useCallback(async () => {
    const data = await getModule(moduleId);
    setModule({
      ...data,
      lessons: data.lessons || [],
      quizzes: data.quizzes || [],
    });
  }, [moduleId]);

  useEffect(() => {
    reload().catch((err) => {
      if (err instanceof ApiClientError && err.status === 403) {
        setError("Module verrouillé. Validez le module précédent.");
      } else {
        setError("Impossible de charger le module.");
      }
    });
  }, [reload]);

  const setLessonCompleted = useCallback((lessonId: string, completed: boolean) => {
    setModule((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lessons: prev.lessons.map((l) => (l.id === lessonId ? { ...l, completed } : l)),
      };
    });
  }, []);

  const value = useMemo(
    () => ({ module, reload, setLessonCompleted }),
    [module, reload, setLessonCompleted]
  );

  return (
    <CourseContext.Provider value={value}>
      <div className="flex h-screen flex-col">
        <header className="app-header flex h-12 shrink-0 items-center justify-between px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-heading">
              {module?.title ?? "Chargement…"}
            </p>
            <p className="eyebrow mt-0.5">IAT Academy · Mode lecture</p>
          </div>
          <ThemeToggleButton className="h-8 w-8" />
        </header>

        <div className="flex min-h-0 flex-1">
          {module && (
            <CourseSidebar
              moduleId={moduleId}
              moduleTitle={module.title}
              lessons={module.lessons}
              quizzes={module.quizzes}
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
