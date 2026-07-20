"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  deleteQuizQuestion,
  addQuizQuestion,
  createQuiz,
  getMyProgress,
  listQuizQuestions,
  listQuizzesPaged,
  updateQuizQuestion,
} from "@/lib/api";
import { QuizSettingsForm } from "@/components/admin/forms/QuizSettingsForm";
import { QuestionForm } from "@/components/admin/forms/QuestionForm";
import type { QuestionFormValues, QuizSettingsValues } from "@/components/admin/forms/schemas";
import { Modal } from "@/components/admin/Modal";
import type { Module, Question, Quiz } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";

export default function QuizBankPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [pageMeta, setPageMeta] = useState({
    page: 0,
    size: 50,
    totalElements: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(0);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editing, setEditing] = useState<Question | null>(null);
  const [filterModuleId, setFilterModuleId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId) ?? null;

  const refreshQuizzes = useCallback(async (p: number, moduleId?: string) => {
    const data = await listQuizzesPaged(p, 50, moduleId || undefined);
    setQuizzes(data.content);
    setPageMeta({
      page: data.page,
      size: data.size,
      totalElements: data.totalElements,
      totalPages: data.totalPages,
    });
    return data;
  }, []);

  const refreshQuestions = useCallback(async (quizId: string) => {
    const data = await listQuizQuestions(quizId);
    setQuestions(data);
    return data;
  }, []);

  useEffect(() => {
    getMyProgress()
      .then(async (prog) => {
        setModules(prog.modules);
        const data = await refreshQuizzes(0);
        if (data.content[0]) setSelectedQuizId(data.content[0].id);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Erreur réseau."))
      .finally(() => setLoading(false));
  }, [refreshQuizzes]);

  useEffect(() => {
    if (!selectedQuizId) {
      setQuestions([]);
      return;
    }
    refreshQuestions(selectedQuizId).catch((err) =>
      setError(err instanceof ApiClientError ? err.message : "Impossible de charger les questions.")
    );
  }, [selectedQuizId, refreshQuestions]);

  async function onFilterChange(moduleId: string) {
    setFilterModuleId(moduleId);
    setPage(0);
    setError(null);
    try {
      const data = await refreshQuizzes(0, moduleId || undefined);
      setSelectedQuizId(data.content[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Filtrage impossible.");
    }
  }

  async function onCreateQuiz(values: QuizSettingsValues) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const data = await createQuiz({
        title: values.title,
        quizType: values.quizType,
        moduleId: values.quizType === "FIN_MODULE" ? values.moduleId || null : null,
        lessonId: values.quizType === "APPLICATIF" ? values.lessonId || null : null,
        passingScore: values.passingScore,
        maxAttempts: values.maxAttempts,
        timeLimitSeconds: values.timeLimitSeconds,
        randomizeQuestions: values.randomizeQuestions,
        randomizeOptions: values.randomizeOptions,
        retryDelayHours: values.retryDelayHours,
        blocking: values.blocking,
        published: values.published,
      });
      await refreshQuizzes(page, filterModuleId || undefined);
      setSelectedQuizId(data.id);
      setCreateOpen(false);
      setMsg(`Quiz créé.`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Création quiz impossible.");
    } finally {
      setBusy(false);
    }
  }

  function toPayload(values: QuestionFormValues) {
    return {
      prompt: values.prompt,
      questionType: values.questionType,
      orderIndex: values.orderIndex,
      explanation: values.explanation || null,
      imageAssetId: values.imageAssetId ? values.imageAssetId : null,
      options: values.options.map((o, i) => ({
        label: o.label,
        correct: o.correct,
        orderIndex: i,
      })),
    };
  }

  async function onAddQuestion(values: QuestionFormValues) {
    if (!selectedQuizId) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      if (editing) {
        await updateQuizQuestion(selectedQuizId, editing.id, toPayload(values));
        setEditing(null);
        setMsg("Question mise à jour.");
      } else {
        await addQuizQuestion(selectedQuizId, toPayload(values));
        setMsg("Question ajoutée.");
      }
      await refreshQuestions(selectedQuizId);
      await refreshQuizzes(page, filterModuleId || undefined);
      setQuestionFormOpen(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Enregistrement question impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteQuestion(q: Question) {
    if (!selectedQuizId) return;
    setBusy(true);
    try {
      await deleteQuizQuestion(selectedQuizId, q.id);
      if (editing?.id === q.id) setEditing(null);
      await refreshQuestions(selectedQuizId);
      await refreshQuizzes(page, filterModuleId || undefined);
      setMsg("Question supprimée.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  const moduleTitle = (id: string | null) =>
    modules.find((m) => m.id === id)?.title ?? "—";

  return (
    <div className="-m-2 flex min-h-[calc(100vh-7rem)] flex-col gap-3 lg:-m-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-2 pt-2 lg:px-4">
        <div>
          <p className="eyebrow">Contenu</p>
          <h1 className="mt-1 text-2xl font-semibold text-heading">Studio Quiz</h1>
          <p className="mt-1 text-sm text-muted">
            {pageMeta.totalElements} quiz — outline à gauche, questions à droite
          </p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className={btn.primary}>
          + Nouveau quiz
        </button>
      </div>

      {error && <p className="alert alert-error mx-2 lg:mx-4">{error}</p>}
      {msg && <p className="alert alert-success mx-2 lg:mx-4">{msg}</p>}

      <div className="card-theme flex min-h-0 flex-1 overflow-hidden rounded-xl">
        <aside className="app-sidebar flex w-72 shrink-0 flex-col border-r border-theme">
          <div className="border-b border-theme p-3">
            <label className="nav-group-label block text-[11px] font-semibold uppercase tracking-wide">
              Filtrer module
            </label>
            <select
              value={filterModuleId}
              onChange={(e) => void onFilterChange(e.target.value)}
              className="select-theme mt-1 w-full"
            >
              <option value="">Tous les modules</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.orderIndex + 1}. {m.title}
                </option>
              ))}
            </select>
          </div>

          <ul className="flex-1 overflow-y-auto p-2">
            {loading && <li className="px-2 py-4 text-xs text-muted">Chargement…</li>}
            {!loading &&
              quizzes.map((q) => {
                const active = q.id === selectedQuizId;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuizId(q.id);
                        setEditing(null);
                        setQuestionFormOpen(false);
                      }}
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
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  void refreshQuizzes(p, filterModuleId || undefined);
                }}
              >
                ←
              </button>
              <button
                type="button"
                disabled={page >= pageMeta.totalPages - 1}
                className={`${btn.neutralXs} flex-1`}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  void refreshQuizzes(p, filterModuleId || undefined);
                }}
              >
                →
              </button>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {!selectedQuiz && (
            <p className="text-sm text-muted">Sélectionnez un quiz dans l&apos;outline.</p>
          )}

          {selectedQuiz && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-heading">{selectedQuiz.title}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {selectedQuiz.quizType} · Module :{" "}
                    {moduleTitle(selectedQuiz.moduleId)} · Seuil{" "}
                    {selectedQuiz.passingScore}% · {selectedQuiz.maxAttempts} tentatives
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={
                      selectedQuiz.moduleId
                        ? `/app/learn/${selectedQuiz.moduleId}/quiz/${selectedQuiz.id}`
                        : `/app/quiz/${selectedQuiz.id}`
                    }
                    className={btn.neutralSm}
                  >
                    Aperçu apprenant
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setQuestionFormOpen(true);
                    }}
                    className={btn.primarySm}
                  >
                    + Question
                  </button>
                </div>
              </div>

              <ul className="space-y-2">
                {questions.map((q, i) => (
                  <li key={q.id} className="card-theme rounded-xl px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="nav-group-label text-[11px] font-semibold uppercase tracking-wide">
                          Q{i + 1} · {q.questionType}
                        </p>
                        <p className="mt-1 text-sm font-medium text-heading">{q.prompt}</p>
                        {q.imageAssetId && (
                          <p className="mt-1 text-[11px] text-muted">🖼 Image jointe</p>
                        )}
                        <ul className="mt-2 space-y-0.5">
                          {q.options?.map((o) => (
                            <li
                              key={o.id ?? o.label}
                              className={`text-xs ${
                                o.correct
                                  ? "font-medium text-[var(--alert-success-fg)]"
                                  : "text-muted"
                              }`}
                            >
                              {o.correct ? "✓ " : "○ "}
                              {o.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            setEditing(q);
                            setQuestionFormOpen(true);
                          }}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="text-xs text-[var(--danger)] hover:underline"
                          onClick={() => void onDeleteQuestion(q)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
                {questions.length === 0 && (
                  <li className="rounded-xl border border-dashed border-theme px-4 py-10 text-center text-sm text-muted">
                    Aucune question — ajoutez la première pour ce quiz.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        title="Nouveau quiz"
        onClose={() => (!busy ? setCreateOpen(false) : undefined)}
      >
        {modules.length > 0 ? (
          <QuizSettingsForm
            key={`create-${modules[0].id}`}
            modules={modules}
            busy={busy}
            defaultValues={{ moduleId: filterModuleId || modules[0].id }}
            onSubmit={onCreateQuiz}
          />
        ) : (
          <p className="text-sm text-muted">Chargement des modules…</p>
        )}
      </Modal>

      <Modal
        open={questionFormOpen && !!selectedQuiz}
        title={editing ? "Modifier la question" : "Nouvelle question"}
        onClose={() => {
          if (!busy) {
            setQuestionFormOpen(false);
            setEditing(null);
          }
        }}
      >
        {selectedQuiz && (
          <>
            <QuestionForm
              key={editing ? editing.id : `new-${selectedQuiz.id}-${questions.length}`}
              busy={busy}
              submitLabel={editing ? "Enregistrer" : "Ajouter"}
              defaultValues={
                editing
                  ? {
                      prompt: editing.prompt,
                      questionType: editing.questionType,
                      orderIndex: editing.orderIndex,
                      explanation: editing.explanation || "",
                      imageAssetId: editing.imageAssetId || "",
                      options: editing.options.map((o, i) => ({
                        label: o.label,
                        correct: o.correct,
                        orderIndex: i,
                      })),
                    }
                  : { orderIndex: questions.length, imageAssetId: "" }
              }
              onSubmit={onAddQuestion}
            />
            {editing && (
              <button
                type="button"
                className="mt-2 text-xs text-muted underline hover:text-heading"
                onClick={() => setEditing(null)}
              >
                Passer en mode ajout
              </button>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
