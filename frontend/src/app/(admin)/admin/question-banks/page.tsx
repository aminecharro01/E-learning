"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addBankQuestion,
  createQuestionBank,
  deleteBankQuestion,
  deleteQuestionBank,
  importBankQuestions,
  listBankQuestions,
  listQuestionBanks,
  type QuestionBank,
} from "@/lib/api";
import type { Question } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/toast-store";
import { btn, inputClass } from "@/lib/ui";
import { QuestionForm } from "@/components/admin/forms/QuestionForm";
import type { QuestionFormValues } from "@/components/admin/forms/schemas";

export default function AdminQuestionBanksPage() {
  const { isAdmin } = useAuth();
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDeleteBank, setConfirmDeleteBank] = useState(false);

  const selected = banks.find((b) => b.id === selectedId) ?? null;

  const reloadBanks = useCallback(async () => {
    const list = await listQuestionBanks();
    setBanks(list);
    return list;
  }, []);

  const reloadQuestions = useCallback(async (bankId: string) => {
    setDetailLoading(true);
    try {
      setQuestions(await listBankQuestions(bankId));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    reloadBanks()
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger les banques de questions."))
      .finally(() => setLoading(false));
  }, [isAdmin, reloadBanks]);

  useEffect(() => {
    if (!selectedId) {
      setQuestions([]);
      return;
    }
    void reloadQuestions(selectedId);
  }, [selectedId, reloadQuestions]);

  if (!isAdmin) {
    return <p className="text-sm text-muted">Réservé aux administrateurs.</p>;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Opération impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onAddQuestion(values: QuestionFormValues) {
    if (!selectedId) return;
    const isChoiceType = ["SINGLE_CHOICE", "MULTI_CHOICE", "TRUE_FALSE"].includes(values.questionType);
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
        acceptedAnswers: (values.fillBlankAcceptedAnswers || "").split(",").map((s) => s.trim()).filter(Boolean),
      };
    } else if (values.questionType === "ESSAY") {
      metadata = values.essayMaxLength ? { maxLength: values.essayMaxLength } : {};
    }
    await run(async () => {
      await addBankQuestion(selectedId, {
        prompt: values.prompt,
        questionType: values.questionType,
        orderIndex: values.orderIndex,
        explanation: values.explanation || null,
        imageAssetId: values.imageAssetId || null,
        options: isChoiceType ? values.options.map((o, i) => ({ label: o.label, correct: o.correct, orderIndex: i })) : [],
        metadata,
      });
      await reloadQuestions(selectedId);
      await reloadBanks();
      setFormOpen(false);
      toast.success("Question ajoutée à la banque.");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Banques de questions</h1>
        <p className="mt-1 text-sm text-muted">
          Constituez un pool de questions réutilisable pour générer des examens par tirage aléatoire
          (option « Générer depuis une banque » à la création d&apos;un quiz).
        </p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <ComponentCard title="Créer une banque" desc="Ex. « Sécurité Niveau 2 »">
            <div className="space-y-2">
              <input className={inputClass} placeholder="Nom" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input
                className={inputClass}
                placeholder="Description (optionnel)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !newName.trim()}
                className={`${btn.primarySm} w-full`}
                onClick={() =>
                  void run(async () => {
                    const created = await createQuestionBank(newName.trim(), newDesc.trim() || undefined);
                    setNewName("");
                    setNewDesc("");
                    await reloadBanks();
                    setSelectedId(created.id);
                    toast.success("Banque créée.");
                  })
                }
              >
                Créer
              </button>
            </div>
          </ComponentCard>

          <ComponentCard title="Banques" desc={`${banks.length} banque(s)`}>
            {loading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : banks.length === 0 ? (
              <p className="text-sm text-muted">Aucune banque pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {banks.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(b.id)}
                      className={`w-full rounded-xl border border-theme px-3 py-2 text-left text-sm ${
                        b.id === selectedId ? "bg-surface-2 ring-2 ring-[var(--ring)]" : ""
                      }`}
                    >
                      <span className="block font-medium text-heading">{b.name}</span>
                      <span className="block text-xs text-muted">{b.questionCount} question(s)</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ComponentCard>
        </div>

        <div className="space-y-4">
          {!selected ? (
            <ComponentCard title="Détail" desc="Sélectionnez une banque à gauche">
              <p className="text-sm text-muted">Aucune banque sélectionnée.</p>
            </ComponentCard>
          ) : (
            <>
              <ComponentCard title={selected.name} desc={selected.description || `${questions.length} question(s)`}>
                <div className="flex gap-2">
                  <button type="button" className={btn.primarySm} onClick={() => setFormOpen((v) => !v)}>
                    {formOpen ? "Annuler" : "+ Question"}
                  </button>
                  <label className={`${btn.neutralSm} cursor-pointer`}>
                    Importer (.xlsx)
                    <input
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        void run(async () => {
                          const result = await importBankQuestions(selected.id, file);
                          await reloadQuestions(selected.id);
                          await reloadBanks();
                          if (result.errors.length === 0) {
                            toast.success(`${result.importedCount} question(s) importée(s).`);
                          } else {
                            toast.error(
                              `${result.importedCount} importée(s), ${result.errors.length} ligne(s) en erreur.`
                            );
                          }
                        });
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className={btn.dangerSm}
                    disabled={busy}
                    onClick={() => setConfirmDeleteBank(true)}
                  >
                    Supprimer la banque
                  </button>
                </div>
                {formOpen && (
                  <div className="mt-4 border-t border-theme pt-4">
                    <QuestionForm busy={busy} submitLabel="Ajouter à la banque" onSubmit={onAddQuestion} />
                  </div>
                )}
              </ComponentCard>

              <ComponentCard title="Questions" desc={`${questions.length} question(s)`}>
                {detailLoading ? (
                  <Skeleton className="h-24 rounded-xl" />
                ) : questions.length === 0 ? (
                  <p className="text-sm text-muted">Aucune question dans cette banque.</p>
                ) : (
                  <ul className="space-y-2">
                    {questions.map((q) => (
                      <li
                        key={q.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-theme px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-heading">{q.prompt}</p>
                          <p className="text-xs text-muted">{q.questionType}</p>
                        </div>
                        <button
                          type="button"
                          className={btn.dangerXs}
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await deleteBankQuestion(selected.id, q.id);
                              await reloadQuestions(selected.id);
                              await reloadBanks();
                              toast.success("Question retirée.");
                            })
                          }
                        >
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </ComponentCard>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteBank}
        title="Supprimer cette banque de questions ?"
        description={`La banque « ${selected?.name ?? ""} » et toutes ses questions seront définitivement supprimées.`}
        danger
        busy={busy}
        confirmLabel="Supprimer"
        onClose={() => setConfirmDeleteBank(false)}
        onConfirm={() =>
          void run(async () => {
            if (!selected) return;
            await deleteQuestionBank(selected.id);
            setSelectedId(null);
            await reloadBanks();
            toast.success("Banque supprimée.");
            setConfirmDeleteBank(false);
          })
        }
      />
    </div>
  );
}
