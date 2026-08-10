"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  deleteQuizQuestion,
  duplicateQuiz,
  duplicateQuizQuestion,
  addQuizQuestion,
  createQuiz,
  getMyProgress,
  getProctoringEvents,
  importQuizQuestions,
  listQuizAttemptsForStaff,
  listQuizQuestions,
  listQuizzesPaged,
  reorderQuizQuestions,
  updateQuizQuestion,
  type QuizAttemptAdmin,
} from "@/lib/api";
import type { ProctoringEvent } from "@/types/domain";
import { QuizSettingsForm } from "@/components/admin/forms/QuizSettingsForm";
import { QuestionForm } from "@/components/admin/forms/QuestionForm";
import type { QuestionFormValues, QuizSettingsValues } from "@/components/admin/forms/schemas";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Module, Question, Quiz } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { moduleSelectGroups } from "@/lib/programme";
import { btn } from "@/lib/ui";
import { toast } from "@/lib/toast-store";

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
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<Question | null>(null);
  const [filterModuleId, setFilterModuleId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attemptsOpen, setAttemptsOpen] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttemptAdmin[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [eventsAttemptId, setEventsAttemptId] = useState<string | null>(null);
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId) ?? null;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  async function onImportQuestions(file: File | undefined) {
    if (!file || !selectedQuizId) return;
    setBusy(true);
    try {
      const result = await importQuizQuestions(selectedQuizId, file);
      await refreshQuestions(selectedQuizId);
      await refreshQuizzes(page, filterModuleId || undefined);
      if (result.errors.length === 0) {
        toast.success(`${result.importedCount} question(s) importée(s).`);
      } else {
        toast.error(
          `${result.importedCount} importée(s), ${result.errors.length} ligne(s) en erreur (ex. ligne ${result.errors[0].rowNumber} : ${result.errors[0].reason})`
        );
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Import impossible.");
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

  useEffect(() => {
    setAttemptsOpen(false);
    setAttempts([]);
  }, [selectedQuizId]);

  async function onToggleAttempts() {
    if (!selectedQuizId) return;
    const next = !attemptsOpen;
    setAttemptsOpen(next);
    if (next) {
      setAttemptsLoading(true);
      try {
        setAttempts(await listQuizAttemptsForStaff(selectedQuizId));
      } catch {
        setAttempts([]);
      } finally {
        setAttemptsLoading(false);
      }
    }
  }

  async function onViewEvents(attemptId: string) {
    setEventsAttemptId(attemptId);
    setEventsLoading(true);
    try {
      setEvents(await getProctoringEvents(attemptId));
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
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
        proctoringEnabled: values.proctoringEnabled,
        focusLossDetection: values.focusLossDetection,
        copyProtection: values.copyProtection,
        lockdownMode: values.lockdownMode,
        drawFromBankId: values.drawFromBankId || undefined,
        drawCount: values.drawCount || undefined,
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
    const isChoiceType =
      values.questionType === "SINGLE_CHOICE" ||
      values.questionType === "MULTI_CHOICE" ||
      values.questionType === "TRUE_FALSE";

    let metadata: Record<string, unknown> | null = null;
    if (values.questionType === "MATCHING") {
      metadata = { pairs: values.matchingPairs.map((p) => ({ left: p.left, right: p.right })) };
    } else if (values.questionType === "HOTSPOT") {
      metadata = {
        imageAssetId: values.imageAssetId || null,
        zones: values.hotspotZones.map((z) => ({ x: z.x, y: z.y, width: z.width, height: z.height })),
      };
    } else if (values.questionType === "FILL_BLANK") {
      metadata = {
        template: values.fillBlankTemplate,
        acceptedAnswers: (values.fillBlankAcceptedAnswers || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
    } else if (values.questionType === "ESSAY") {
      metadata = values.essayMaxLength ? { maxLength: values.essayMaxLength } : {};
    }

    return {
      prompt: values.prompt,
      questionType: values.questionType,
      orderIndex: values.orderIndex,
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
                  <button type="button" onClick={() => void onDuplicateQuiz()} className={btn.neutralSm} disabled={busy}>
                    Dupliquer le quiz
                  </button>
                  <label className={`${btn.neutralSm} cursor-pointer`}>
                    Importer (.xlsx)
                    <input
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        void onImportQuestions(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
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
              <p className="text-xs text-muted">
                Import Excel : colonnes Énoncé | Type (SINGLE_CHOICE/MULTI_CHOICE/TRUE_FALSE) | Option1 | Correcte1
                (OUI/VRAI/X) | Option2 | Correcte2 | Option3 | Correcte3 | Option4 | Correcte4, ligne d&apos;en-tête incluse.
              </p>

              {questions.length > 1 && (
                <p className="text-xs text-muted">Glissez-déposez (⋮⋮) pour réordonner les questions.</p>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndQuestions}>
                <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {questions.map((q, i) => (
                      <SortableQuestionItem
                        key={q.id}
                        question={q}
                        index={i}
                        onEdit={() => {
                          setEditing(q);
                          setQuestionFormOpen(true);
                        }}
                        onDelete={() => setDeleteQuestionTarget(q)}
                        onDuplicate={() => void onDuplicateQuestion(q)}
                      />
                    ))}
                    {questions.length === 0 && (
                      <li className="rounded-xl border border-dashed border-theme px-4 py-10 text-center text-sm text-muted">
                        Aucune question — ajoutez la première pour ce quiz.
                      </li>
                    )}
                  </ul>
                </SortableContext>
              </DndContext>

              <div className="border-t border-theme pt-4">
                <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => void onToggleAttempts()}>
                  {attemptsOpen ? "Masquer les tentatives" : "Voir les tentatives"}
                </button>
                {attemptsOpen && (
                  <div className="mt-3">
                    {attemptsLoading ? (
                      <Skeleton className="h-20 rounded-xl" />
                    ) : attempts.length === 0 ? (
                      <p className="text-sm text-muted">Aucune tentative pour ce quiz.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {attempts.map((a) => (
                          <li
                            key={a.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme px-3 py-1.5 text-xs"
                          >
                            <span>
                              {a.userFullName} — {a.status}
                              {a.score !== null && ` — ${a.score}%`}
                            </span>
                            {a.proctoringEventCount > 0 && (
                              <button
                                type="button"
                                className="badge-inline badge-gold"
                                onClick={() => void onViewEvents(a.id)}
                              >
                                {a.proctoringEventCount} évènement(s) anti-triche
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
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

      <Modal
        open={eventsAttemptId !== null}
        title="Évènements anti-triche"
        onClose={() => setEventsAttemptId(null)}
      >
        {eventsLoading ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted">Aucun évènement.</p>
        ) : (
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="rounded-lg border border-theme px-3 py-1.5 text-xs">
                <span className="font-medium text-heading">{e.eventType}</span>
                <span className="ml-2 text-muted">
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" }).format(
                    new Date(e.occurredAt)
                  )}
                </span>
              </li>
            ))}
          </ul>
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
    </div>
  );
}

function SortableQuestionItem({
  question: q,
  index: i,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <li ref={setNodeRef} style={style} className="card-theme rounded-xl px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 gap-2">
          <button
            type="button"
            className={`${btn.neutralXs} h-fit cursor-grab touch-none`}
            aria-label="Glisser pour réordonner"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
          <div className="min-w-0 flex-1">
            <p className="nav-group-label text-[11px] font-semibold uppercase tracking-wide">
              Q{i + 1} · {q.questionType}
            </p>
            <p className="mt-1 text-sm font-medium text-heading">{q.prompt}</p>
            {q.imageAssetId && <p className="mt-1 text-[11px] text-muted">🖼 Image jointe</p>}
            <ul className="mt-2 space-y-0.5">
              {q.options?.map((o) => (
                <li
                  key={o.id ?? o.label}
                  className={`text-xs ${o.correct ? "font-medium text-[var(--alert-success-fg)]" : "text-muted"}`}
                >
                  {o.correct ? "✓ " : "○ "}
                  {o.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="text-xs text-primary hover:underline" onClick={onEdit}>
            Modifier
          </button>
          <button type="button" className="text-xs text-primary hover:underline" onClick={onDuplicate}>
            Dupliquer
          </button>
          <button type="button" className="text-xs text-[var(--danger)] hover:underline" onClick={onDelete}>
            Supprimer
          </button>
        </div>
      </div>
    </li>
  );
}
