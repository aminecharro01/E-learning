"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Module, Quiz } from "@/types/domain";
import { moduleSelectGroups } from "@/lib/programme";
import { btn } from "@/lib/ui";

type PageMeta = { page: number; size: number; totalElements: number; totalPages: number };

type Props = {
  modules: Module[];
  quizzes: Quiz[];
  selectedQuizId: string | null;
  filterModuleId: string;
  loading: boolean;
  page: number;
  pageMeta: PageMeta;
  onSelectQuiz: (quizId: string) => void;
  onFilterChange: (moduleId: string) => void;
  onPageChange: (page: number) => void;
};

/** Left outline of the quiz bank — module filter + quiz list + pagination. Extracted from
 * quiz-bank/page.tsx (was 831 lines) to keep the page focused on state/composition. */
export function QuizOutlineSidebar({
  modules,
  quizzes,
  selectedQuizId,
  filterModuleId,
  loading,
  page,
  pageMeta,
  onSelectQuiz,
  onFilterChange,
  onPageChange,
}: Props) {
  return (
    <aside className="app-sidebar flex w-72 shrink-0 flex-col border-r border-theme">
      <div className="border-b border-theme p-3">
        <label className="nav-group-label block text-[11px] font-semibold uppercase tracking-wide">
          Filtrer module
        </label>
        <select
          value={filterModuleId}
          onChange={(e) => onFilterChange(e.target.value)}
          className="select-theme mt-1 w-full"
        >
          <option value="">Tous les modules</option>
          {moduleSelectGroups(modules).map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <ul className="flex-1 overflow-y-auto p-2">
        {loading && (
          <li className="space-y-2 p-2">
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
          </li>
        )}
        {!loading &&
          quizzes.map((q) => {
            const active = q.id === selectedQuizId;
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onSelectQuiz(q.id)}
                  className={`nav-item mb-0.5 w-full rounded-lg px-2.5 py-2.5 text-left ${
                    active ? "nav-item-active" : ""
                  }`}
                >
                  <p className={`truncate text-sm font-medium ${active ? "text-primary" : "text-heading"}`}>
                    {q.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    {q.quizType === "FIN_MODULE" ? "Fin de module" : "Section"} ·{" "}
                    {q.questionCount ?? 0} q. · {q.published ? "Publié" : "Brouillon"}
                  </p>
                </button>
              </li>
            );
          })}
        {!loading && quizzes.length === 0 && (
          <li className="px-2 py-8 text-center text-xs text-muted">
            Aucun quiz. Créez-en un avec le bouton ci-dessus.
          </li>
        )}
      </ul>

      {pageMeta.totalPages > 1 && (
        <div className="flex gap-2 border-t border-theme p-2">
          <button
            type="button"
            disabled={page <= 0}
            className={`${btn.neutralXs} flex-1`}
            onClick={() => onPageChange(page - 1)}
          >
            <ArrowLeft size={14} aria-hidden />
          </button>
          <button
            type="button"
            disabled={page >= pageMeta.totalPages - 1}
            className={`${btn.neutralXs} flex-1`}
            onClick={() => onPageChange(page + 1)}
          >
            <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      )}
    </aside>
  );
}
