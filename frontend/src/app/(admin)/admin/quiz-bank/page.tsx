"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Copy, Eye, Settings, Sparkles, Trash2 } from "lucide-react";
import {
  deleteQuiz,
  deleteQuizQuestion,
  duplicateQuiz,
  duplicateQuizQuestion,
  addQuizQuestion,
  createQuiz,
  generateQuizQuestionsAi,
  getMyProgress,
  listQuizQuestions,
  listQuizzesPaged,
  reorderQuizQuestions,
  updateQuiz,
  updateQuizQuestion,
  type AiGenerationPayload,
} from "@/lib/api";
import { QuizSettingsForm } from "@/components/admin/forms/QuizSettingsForm";
import { QuestionForm } from "@/components/admin/forms/QuestionForm";
import { AiGenerateForm } from "@/components/admin/forms/AiGenerateForm";
import type { QuestionFormValues, QuizSettingsValues } from "@/components/admin/forms/schemas";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { QuizOutlineSidebar } from "@/components/admin/quiz/QuizOutlineSidebar";
import { QuizQuestionList } from "@/components/admin/quiz/QuizQuestionList";
import { QuizAttemptsPanel } from "@/components/admin/quiz/QuizAttemptsPanel";
import { AccessLocked } from "@/components/admin/ui/AccessLocked";
import { useAuth } from "@/hooks/useAuth";
import type { Module, Question, Quiz } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";
import { toast } from "@/lib/toast-store";

export default function QuizBankPage() {
  const { hasRole } = useAuth();
  const allowed = hasRole("SUPER_ADMIN", "ADMIN", "FORMATEUR");
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
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<Question | null>(null);
  const [deleteQuizConfirmOpen, setDeleteQuizConfirmOpen] = useState(false);
  const [filterModuleId, setFilterModuleId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId) ?? null;

  async function onDuplicateQuestion(q: Question) {
    if (!selectedQuizId) return;
    setBusy(true);
    try {
      await duplicateQuizQuestion(selectedQuizId, q.id);
      await refreshQuestions(selectedQuizId);
      toast.success("Question dupliquée.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Duplication impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onDuplicateQuiz() {
    if (!selectedQuizId) return;
    setBusy(true);
    try {
      const copy = await duplicateQuiz(selectedQuizId);
      await refreshQuizzes(page, filterModuleId || undefined);
      setSelectedQuizId(copy.id);
      toast.success("Quiz dupliqué — pensez à le publier une fois relu.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Duplication impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteQuiz() {
    if (!selectedQuizId) return;
    setBusy(true);
    try {
      await deleteQuiz(selectedQuizId);
      setSelectedQuizId(null);
      setDeleteQuizConfirmOpen(false);
      await refreshQuizzes(page, filterModuleId || undefined);
      toast.success("Quiz supprimé.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Suppression du quiz impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateAi(payload: AiGenerationPayload) {
    if (!selectedQuizId) return;
    setBusy(true);
    try {
      const result = await generateQuizQuestionsAi(selectedQuizId, payload);
      await refreshQuestions(selectedQuizId);
      await refreshQuizzes(page, filterModuleId || undefined);
      setAiGenerateOpen(false);
      if (result.errors.length === 0) {
        toast.success(`${result.generatedCount} question(s) générée(s).`);
      } else {
        toast.error(
          `${result.generatedCount} générée(s), ${result.errors.length} en erreur (${result.errors[0].reason})`
        );
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Génération IA impossible.");
    } finally {
      setBusy(false);
    }
  }

  function onDragEndQuestions(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedQuizId) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(questions, oldIndex, newIndex);
    setQuestions(next);
    reorderQuizQuestions(selectedQuizId, next.map((q) => q.id)).catch(() => {
      toast.error("Échec de l'enregistrement de l'ordre.");
      void refreshQuestions(selectedQuizId);
    });
  }

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
    if (!allowed) return;
    getMyProgress()
      .then(async (prog) => {
        setModules(prog.modules);
        const data = await refreshQuizzes(0);
        if (data.content[0]) setSelectedQuizId(data.content[0].id);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Erreur réseau."))
      .finally(() => setLoading(false));
  }, [allowed, refreshQuizzes]);

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

  function toQuizPayload(values: QuizSettingsValues) {
    return {
      title: values.title,
      quizType: values.quizType,
      moduleId: values.quizType === "FIN_MODULE" ? values.moduleId || null : null,
      lessonId: values.quizType === "APPLICATIF" ? values.lessonId || null : null,
      ufCode: values.quizType === "FIN_UF" ? values.ufCode || null : null,
      yearNumber: values.quizType === "FIN_ANNEE" ? values.yearNumber || null : null,
      passingScore: values.passingScore,
      maxAttempts: values.maxAttempts,
      timeLimitSeconds: values.timeLimitSeconds,
      randomizeQuestions: values.randomizeQuestions,
      randomizeOptions: values.randomizeOptions,
      retryDelayMinutes: values.retryDelayMinutes,
      blocking: values.blocking,
      published: values.published,
      proctoringEnabled: values.proctoringEnabled,
      focusLossDetection: values.focusLossDetection,
      copyProtection: values.copyProtection,
      lockdownMode: values.lockdownMode,
    };
  }

  async function onCreateQuiz(values: QuizSettingsValues) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const data = await createQuiz(toQuizPayload(values));
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

  async function onUpdateQuizSettings(values: QuizSettingsValues) {
    if (!selectedQuizId) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await updateQuiz(selectedQuizId, toQuizPayload(values));
      await refreshQuizzes(page, filterModuleId || undefined);
      setSettingsOpen(false);
      setMsg("Réglages du quiz mis à jour.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Mise à jour des réglages impossible.");
    } finally {
      setBusy(false);
    }
  }

  function toPayload(values: QuestionFormValues) {
    const isChoiceType =
      values.questionType === "SINGLE_CHOICE" ||
      values.questionType === "MULTI_CHOICE" ||
      values.questionType === "TRUE_FALSE";

    const metadata: Record<string, unknown> | null =
      values.questionType === "ESSAY" ? (values.essayMaxLength ? { maxLength: values.essayMaxLength } : {}) : null;

    return {
      prompt: values.prompt,
      questionType: values.questionType,
      explanation: values.explanation || null,
      imageAssetId: values.imageAssetId ? values.imageAssetId : null,
      options: isChoiceType
        ? values.options.map((o, i) => ({
            label: o.label,
            correct: o.correct,
            orderIndex: i,
          }))
        : [],
      metadata,
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

  async function confirmDeleteQuestion() {
    const q = deleteQuestionTarget;
    if (!q || !selectedQuizId) return;
    setBusy(true);
    try {
      await deleteQuizQuestion(selectedQuizId, q.id);
      if (editing?.id === q.id) setEditing(null);
      await refreshQuestions(selectedQuizId);
      await refreshQuizzes(page, filterModuleId || undefined);
      setMsg("Question supprimée.");
      setDeleteQuestionTarget(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression de la question impossible.");
    } finally {
      setBusy(false);
    }
  }

  const moduleTitle = (id: string | null) =>
    modules.find((m) => m.id === id)?.title ?? "—";

  if (!allowed) {
    return <AccessLocked reason="Réservé au Directeur, au Formateur et au Super Admin." />;
  }

  return (
    <div className="-m-2 flex min-h-[calc(100vh-7rem)] flex-col gap-3 lg:-m-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-2 pt-2 lg:px-4">
        <div>
          <p className="eyebrow">Contenu</p>
          <h1 className="mt-1 text-2xl font-semibold text-heading">Banque de quiz</h1>
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
        <QuizOutlineSidebar
          modules={modules}
          quizzes={quizzes}
          selectedQuizId={selectedQuizId}
          filterModuleId={filterModuleId}
          loading={loading}
          page={page}
          pageMeta={pageMeta}
          onSelectQuiz={(id) => {
            setSelectedQuizId(id);
            setEditing(null);
            setQuestionFormOpen(false);
          }}
          onFilterChange={(id) => void onFilterChange(id)}
          onPageChange={(p) => {
            setPage(p);
            void refreshQuizzes(p, filterModuleId || undefined);
          }}
        />

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
                    {selectedQuiz.quizType} ·{" "}
                    {selectedQuiz.quizType === "FIN_UF"
                      ? `UF : ${selectedQuiz.ufCode ?? "—"}`
                      : selectedQuiz.quizType === "FIN_ANNEE"
                        ? `Année ${selectedQuiz.yearNumber ?? "—"}`
                        : `Module : ${moduleTitle(selectedQuiz.moduleId)}`}{" "}
                    · Seuil {selectedQuiz.passingScore}% · {selectedQuiz.maxAttempts} tentatives
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={
                      selectedQuiz.moduleId
                        ? `/app/learn/${selectedQuiz.moduleId}/quiz/${selectedQuiz.id}`
                        : `/app/quiz/${selectedQuiz.id}`
                    }
                    className={btn.icon}
                    aria-label="Aperçu apprenant"
                    title="Aperçu apprenant"
                  >
                    <Eye size={16} aria-hidden />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className={btn.icon}
                    aria-label="Réglages du quiz"
                    title="Réglages du quiz"
                  >
                    <Settings size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDuplicateQuiz()}
                    className={btn.icon}
                    disabled={busy}
                    aria-label="Dupliquer le quiz"
                    title="Dupliquer le quiz"
                  >
                    <Copy size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteQuizConfirmOpen(true)}
                    className={btn.icon}
                    disabled={busy}
                    aria-label="Supprimer le quiz"
                    title="Supprimer le quiz"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiGenerateOpen(true)}
                    className={btn.icon}
                    disabled={busy}
                    aria-label="Générer avec IA"
                    title="Générer avec IA"
                  >
                    <Sparkles size={16} aria-hidden />
                  </button>
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

              <QuizQuestionList
                questions={questions}
                onReorder={onDragEndQuestions}
                onEdit={(q) => {
                  setEditing(q);
                  setQuestionFormOpen(true);
                }}
                onDelete={(q) => setDeleteQuestionTarget(q)}
                onDuplicate={(q) => void onDuplicateQuestion(q)}
              />

              <QuizAttemptsPanel key={selectedQuiz.id} quizId={selectedQuiz.id} />
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
        open={settingsOpen && !!selectedQuiz}
        title="Réglages du quiz"
        onClose={() => (!busy ? setSettingsOpen(false) : undefined)}
      >
        {selectedQuiz && (
          <QuizSettingsForm
            key={`edit-${selectedQuiz.id}`}
            modules={modules}
            busy={busy}
            submitLabel="Enregistrer"
            submittingLabel="Enregistrement…"
            defaultValues={{
              title: selectedQuiz.title,
              quizType: selectedQuiz.quizType,
              moduleId: selectedQuiz.moduleId || "",
              lessonId: selectedQuiz.lessonId || "",
              ufCode: selectedQuiz.ufCode || "",
              yearNumber: selectedQuiz.yearNumber || undefined,
              passingScore: selectedQuiz.passingScore,
              maxAttempts: selectedQuiz.maxAttempts,
              timeLimitSeconds: selectedQuiz.timeLimitSeconds,
              randomizeQuestions: selectedQuiz.randomizeQuestions,
              randomizeOptions: selectedQuiz.randomizeOptions,
              retryDelayMinutes: selectedQuiz.retryDelayMinutes,
              blocking: selectedQuiz.blocking,
              published: selectedQuiz.published,
              proctoringEnabled: selectedQuiz.proctoringEnabled ?? false,
              focusLossDetection: selectedQuiz.focusLossDetection ?? false,
              copyProtection: selectedQuiz.copyProtection ?? false,
              lockdownMode: selectedQuiz.lockdownMode ?? false,
            }}
            onSubmit={onUpdateQuizSettings}
          />
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
                      explanation: editing.explanation || "",
                      imageAssetId: editing.imageAssetId || "",
                      options: editing.options.map((o, i) => ({
                        label: o.label,
                        correct: o.correct,
                        orderIndex: i,
                      })),
                    }
                  : { imageAssetId: "" }
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

      <Modal
        open={aiGenerateOpen && !!selectedQuiz}
        title="Générer des questions avec IA"
        onClose={() => (!busy ? setAiGenerateOpen(false) : undefined)}
      >
        {selectedQuiz && (
          <AiGenerateForm busy={busy} lessonId={selectedQuiz.lessonId} onSubmit={onGenerateAi} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteQuestionTarget}
        title="Supprimer cette question ?"
        description={`La question « ${deleteQuestionTarget?.prompt ?? ""} » sera définitivement supprimée.`}
        danger
        busy={busy}
        confirmLabel="Supprimer"
        onClose={() => setDeleteQuestionTarget(null)}
        onConfirm={() => void confirmDeleteQuestion()}
      />

      <ConfirmDialog
        open={deleteQuizConfirmOpen}
        title="Supprimer ce quiz ?"
        description={`Le quiz « ${selectedQuiz?.title ?? ""} » et toutes ses questions et tentatives seront définitivement supprimés.`}
        danger
        busy={busy}
        confirmLabel="Supprimer"
        onClose={() => setDeleteQuizConfirmOpen(false)}
        onConfirm={() => void confirmDeleteQuiz()}
      />
    </div>
  );
}
