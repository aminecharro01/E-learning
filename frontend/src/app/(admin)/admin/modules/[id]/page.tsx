"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  createLesson,
  deleteLesson,
  getLesson,
  getModule,
  listQuizzes,
  updateLesson,
  updateModule,
} from "@/lib/api";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { LessonForm } from "@/components/admin/forms/LessonForm";
import { ModuleForm } from "@/components/admin/forms/ModuleForm";
import type { LessonFormValues, ModuleFormValues } from "@/components/admin/forms/schemas";
import {
  IconButton,
  IconEdit,
  IconEye,
  IconPublish,
  IconTrash,
} from "@/components/admin/ActionIcons";
import { BlockEditor } from "@/components/admin/BlockEditor";
import { LessonLockBanner } from "@/components/admin/LessonLockBanner";
import { LessonBlocks } from "@/components/learner/LessonBlocks";
import type { Lesson, LessonBlock, Module, Quiz } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { yearLabel } from "@/lib/programme";
import { IconCompass, IconPlane } from "@/components/brand/IatIcons";
import { btn } from "@/lib/ui";

export default function AdminModuleStudioPage() {
  const params = useParams<{ id: string }>();
  const moduleId = params.id;

  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lessonDetail, setLessonDetail] = useState<Lesson | null>(null);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editModuleOpen, setEditModuleOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);

  const reload = useCallback(async () => {
    if (!moduleId) return [];
    const data = await getModule(moduleId);
    setModule(data);
    setLessons(data.lessons || []);
    try {
      setQuizzes(await listQuizzes(moduleId));
    } catch {
      setQuizzes([]);
    }
    return data.lessons || [];
  }, [moduleId]);

  useEffect(() => {
    reload()
      .then((ls) => {
        const fromQuery =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("section")
            : null;
        const pick =
          (fromQuery && ls.find((l) => l.id === fromQuery)?.id) || ls[0]?.id || null;
        setSelectedId(pick);
      })
      .catch((err) =>
        setError(err instanceof ApiClientError ? err.message : "Module inaccessible.")
      )
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (!selectedId) {
      setLessonDetail(null);
      return;
    }
    setDetailLoading(true);
    setPreview(false);
    getLesson(selectedId)
      .then(setLessonDetail)
      .catch((err) =>
        setError(err instanceof ApiClientError ? err.message : "Section inaccessible.")
      )
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  async function onUpdateModule(values: ModuleFormValues) {
    if (!module) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateModule(module.id, {
        title: values.title,
        description: values.description || undefined,
        orderIndex: values.orderIndex,
        published: values.published,
        yearNumber: values.yearNumber,
        ufCode: values.ufCode,
        ufTitle: values.ufTitle,
      });
      setModule((prev) =>
        prev
          ? {
              ...prev,
              title: updated.title,
              description: updated.description,
              orderIndex: updated.orderIndex,
              published: updated.published,
              yearNumber: updated.yearNumber,
              ufCode: updated.ufCode,
              ufTitle: updated.ufTitle,
              code: updated.code ?? prev.code,
            }
          : prev
      );
      setEditModuleOpen(false);
      setMsg("Module mis à jour.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Mise à jour impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleModulePublished() {
    if (!module) return;
    setBusy(true);
    try {
      const updated = await updateModule(module.id, {
        title: module.title,
        description: module.description || undefined,
        orderIndex: module.orderIndex,
        published: !module.published,
        yearNumber: module.yearNumber ?? undefined,
        ufCode: module.ufCode ?? undefined,
        ufTitle: module.ufTitle ?? undefined,
      });
      setModule((prev) =>
        prev
          ? {
              ...prev,
              title: updated.title,
              description: updated.description,
              orderIndex: updated.orderIndex,
              published: updated.published,
              yearNumber: updated.yearNumber,
              ufCode: updated.ufCode,
              ufTitle: updated.ufTitle,
              code: updated.code ?? prev.code,
            }
          : prev
      );
      setMsg(updated.published ? "Module publié." : "Module désactivé.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Changement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateLesson(values: LessonFormValues) {
    if (!moduleId) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createLesson(moduleId, {
        title: values.title,
        orderIndex: values.orderIndex,
        published: values.published,
      });
      await reload();
      setSelectedId(created.id);
      setCreateOpen(false);
      setMsg("Section créée.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onUpdateLesson(values: LessonFormValues) {
    if (!editingLesson) return;
    setBusy(true);
    setError(null);
    try {
      await updateLesson(editingLesson.id, {
        title: values.title,
        orderIndex: values.orderIndex,
        published: values.published,
      });
      await reload();
      if (lessonDetail?.id === editingLesson.id) {
        setLessonDetail(await getLesson(editingLesson.id));
      }
      setEditingLesson(null);
      setMsg("Section mise à jour.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Mise à jour impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLessonPublished(lesson: Lesson) {
    setBusy(true);
    try {
      await updateLesson(lesson.id, { published: !lesson.published });
      await reload();
      if (lessonDetail?.id === lesson.id) {
        setLessonDetail(await getLesson(lesson.id));
      }
      setMsg(!lesson.published ? "Section publiée." : "Section désactivée.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Changement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const wasSelected = selectedId === deleteTarget.id;
      await deleteLesson(deleteTarget.id);
      const ls = await reload();
      setDeleteTarget(null);
      if (wasSelected) setSelectedId(ls[0]?.id ?? null);
      setMsg("Section supprimée.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Chargement…</p>;
  }

  if (!module) {
    return (
      <div className="space-y-3">
        <p className="alert alert-error">{error || "Module introuvable."}</p>
        <Link href="/admin/modules" className="text-sm text-primary hover:underline">
          ← Retour aux modules
        </Link>
      </div>
    );
  }

  const moduleQuiz = quizzes.find((q) => q.quizType === "FIN_MODULE");

  return (
    <div className="iat-board -m-2 flex min-h-[calc(100vh-7rem)] flex-col gap-3 lg:-m-4">
      <section className="boarding-pass mx-2 mt-2 !mb-0 lg:mx-4" aria-label="Atelier du module">
        <div className="bp-main">
          <Link href="/admin/modules" className="bp-eyebrow !mb-2 inline-flex">
            <IconPlane size={14} />
            ← Catalogue
          </Link>
          <p className="learn-mod-meta mb-1">
            {yearLabel(module.yearNumber ?? 1)}
            {module.ufTitle ? ` · ${module.ufTitle}` : module.ufCode ? ` · ${module.ufCode}` : ""}
          </p>
          <h1 className="bp-title !text-[1.35rem] sm:!text-[1.6rem]">
            {module.title.split(" ").length > 1 ? (
              <>
                {module.title.split(" ").slice(0, -1).join(" ")}{" "}
                <span className="grad">{module.title.split(" ").slice(-1).join(" ")}</span>
              </>
            ) : (
              module.title
            )}
          </h1>
          <p className="bp-desc !mt-2 line-clamp-2">{module.description || "—"}</p>
          <div className="bp-actions !mt-3">
            <span
              className={`badge-inline ${module.published ? "badge-success" : "badge-gold"}`}
            >
              <IconCompass size={14} />
              {module.published ? "Publié" : "Brouillon"}
            </span>
            <IconButton label="Modifier le module" onClick={() => setEditModuleOpen(true)}>
              <IconEdit />
            </IconButton>
            <IconButton
              label={module.published ? "Désactiver" : "Publier"}
              tone={module.published ? "success" : "warn"}
              onClick={() => void toggleModulePublished()}
            >
              <IconPublish on={module.published} />
            </IconButton>
            <Link href={`/app/learn/${module.id}`} className={btn.neutralSm}>
              Aperçu apprenant
            </Link>
          </div>
        </div>
        <div className="bp-stub">
          <div className="bp-flight-code">ATELIER</div>
          <div className="bp-gate">
            <span>UF</span>
            {(module.ufCode || "—").replace(/^UF\s*/i, "") || "—"}
          </div>
          <div className="bp-barcode" aria-hidden />
        </div>
        <div className="bp-notch" aria-hidden />
      </section>


      {error && <p className="alert alert-error mx-2 lg:mx-4">{error}</p>}
      {msg && <p className="alert alert-success mx-2 lg:mx-4">{msg}</p>}

      <div className="card-theme flex min-h-0 flex-1 overflow-hidden rounded-xl">
        <aside className="app-sidebar flex w-64 shrink-0 flex-col border-r border-theme">
          <div className="flex items-center justify-between border-b border-theme px-3 py-3">
            <p className="nav-group-label text-xs font-semibold uppercase tracking-wide">
              Sections ({lessons.length})
            </p>
            <button type="button" onClick={() => setCreateOpen(true)} className={btn.primaryXs}>
              + Ajouter
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {lessons.map((lesson, i) => {
              const active = lesson.id === selectedId;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(lesson.id)}
                    className={`nav-item flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                      active ? "nav-item-active" : ""
                    }`}
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{lesson.title}</span>
                      <span className="text-[11px] text-muted">
                        {lesson.published ? "Publiée" : "Brouillon"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {lessons.length === 0 && (
              <li className="px-2 py-6 text-center text-xs text-muted">Aucune section</li>
            )}
          </ul>
          {moduleQuiz && (
            <div className="border-t border-theme p-3">
              <p className="nav-group-label mb-1 text-[11px] font-semibold uppercase">Quiz du module</p>
              <Link
                href="/admin/quiz-bank"
                className="block truncate text-sm text-[var(--alert-warning-fg)] hover:underline"
              >
                {moduleQuiz.title}
              </Link>
              <p className="mt-1 text-[11px] text-muted">
                {moduleQuiz.published ? "Publié" : "Brouillon"} · géré dans Quiz & questions
              </p>
            </div>
          )}
          {!moduleQuiz && (
            <div className="border-t border-theme p-3">
              <Link href="/admin/quiz-bank" className="text-xs text-primary hover:underline">
                + Associer un quiz fin de module
              </Link>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {!selectedId && (
            <p className="text-sm text-muted">Sélectionnez ou créez une section.</p>
          )}
          {detailLoading && <p className="text-sm text-muted">Chargement de la section…</p>}
          {lessonDetail && !detailLoading && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-heading">{lessonDetail.title}</h2>
                  <p className="text-xs text-muted">
                    Éditeur de contenu · #{lessonDetail.orderIndex + 1}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPreview((v) => !v)}
                    className={`tab-pill rounded-lg border border-theme px-3 py-1.5 text-sm ${
                      preview ? "tab-pill-active" : ""
                    }`}
                  >
                    {preview ? "Mode édition" : "Aperçu contenu"}
                  </button>
                  <IconButton label="Métadonnées" onClick={() => setEditingLesson(lessonDetail)}>
                    <IconEdit />
                  </IconButton>
                  <IconButton
                    label={lessonDetail.published ? "Désactiver" : "Publier"}
                    tone={lessonDetail.published ? "success" : "warn"}
                    onClick={() => void toggleLessonPublished(lessonDetail)}
                  >
                    <IconPublish on={lessonDetail.published} />
                  </IconButton>
                  <IconButton
                    label="Aperçu salle de cours"
                    onClick={() =>
                      window.open(`/app/learn/${moduleId}/s/${lessonDetail.id}`, "_blank")
                    }
                  >
                    <IconEye />
                  </IconButton>
                  <IconButton
                    label="Supprimer"
                    tone="danger"
                    onClick={() => setDeleteTarget(lessonDetail)}
                  >
                    <IconTrash />
                  </IconButton>
                </div>
              </div>

              <LessonLockBanner lessonId={lessonDetail.id} />

              {preview ? (
                <div className="card-theme rounded-xl bg-surface-2 p-6">
                  <p className="nav-group-label mb-4 text-xs font-semibold uppercase tracking-wide">
                    Aperçu apprenant
                  </p>
                  <LessonBlocks
                    blocks={(lessonDetail.blocks || []) as LessonBlock[]}
                    lessonId={lessonDetail.id}
                  />
                </div>
              ) : (
                <BlockEditor
                  key={lessonDetail.id}
                  lessonId={lessonDetail.id}
                  initialBlocks={(lessonDetail.blocks || []) as LessonBlock[]}
                  onChange={(blocks) =>
                    setLessonDetail((prev) => (prev ? { ...prev, blocks } : prev))
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={editModuleOpen}
        title="Modifier le module"
        onClose={() => (!busy ? setEditModuleOpen(false) : undefined)}
      >
        <ModuleForm
          key={`edit-${module.id}`}
          busy={busy}
          submitLabel="Enregistrer"
          onCancel={() => setEditModuleOpen(false)}
          defaultValues={{
            title: module.title,
            description: module.description || "",
            orderIndex: module.orderIndex,
            published: module.published,
            yearNumber: module.yearNumber ?? 1,
            ufCode: module.ufCode ?? "UF 1",
            ufTitle: module.ufTitle ?? "Langues et communication",
          }}
          onSubmit={onUpdateModule}
        />
      </Modal>

      <Modal
        open={createOpen}
        title="Nouvelle section"
        onClose={() => (!busy ? setCreateOpen(false) : undefined)}
      >
        <LessonForm
          key={`create-${lessons.length}`}
          busy={busy}
          submitLabel="Créer la section"
          onCancel={() => setCreateOpen(false)}
          defaultValues={{
            title: "Nouvelle section",
            orderIndex: lessons.length,
            published: true,
          }}
          onSubmit={onCreateLesson}
        />
      </Modal>

      <Modal
        open={!!editingLesson}
        title="Modifier la section"
        onClose={() => (!busy ? setEditingLesson(null) : undefined)}
      >
        {editingLesson && (
          <LessonForm
            key={editingLesson.id}
            busy={busy}
            submitLabel="Enregistrer"
            onCancel={() => setEditingLesson(null)}
            defaultValues={{
              title: editingLesson.title,
              orderIndex: editingLesson.orderIndex,
              published: editingLesson.published,
            }}
            onSubmit={onUpdateLesson}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer cette section ?"
        description={`La section « ${deleteTarget?.title ?? ""} » et ses blocs seront définitivement supprimés.`}
        danger
        busy={busy}
        confirmLabel="Supprimer"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
