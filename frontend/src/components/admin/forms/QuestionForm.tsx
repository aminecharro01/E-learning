"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Circle, Plus, X } from "lucide-react";
import { questionFormSchema, type QuestionFormValues } from "./schemas";
import { FormField, FormSection, fieldClass } from "./FormField";
import { resolveAssetUrl, uploadMedia } from "@/lib/media";
import { AssetPicker } from "@/components/admin/AssetPicker";
import { btn } from "@/lib/ui";
import type { QuizQuestionMode } from "@/types/domain";

type Props = {
  defaultValues?: Partial<QuestionFormValues>;
  busy?: boolean;
  submitLabel?: string;
  /** Mode fixé par le quiz — verrouille le type de question acceptable, voir QuizQuestionMode. */
  quizQuestionMode: QuizQuestionMode;
  onSubmit: (values: QuestionFormValues) => Promise<void> | void;
};

export function QuestionForm({
  defaultValues,
  busy,
  submitLabel = "Ajouter la question",
  quizQuestionMode,
  onSubmit,
}: Props) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema) as Resolver<QuestionFormValues>,
    mode: "onBlur",
    defaultValues: {
      prompt: "",
      questionType: quizQuestionMode === "OPEN_ENDED" ? "ESSAY" : "SINGLE_CHOICE",
      explanation: "",
      imageAssetId: "",
      options: [
        { label: "Bonne réponse", correct: true, orderIndex: 0 },
        { label: "Mauvaise réponse", correct: false, orderIndex: 1 },
      ],
      essayMaxLength: undefined,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "options" });
  const questionType = watch("questionType");
  const imageAssetId = watch("imageAssetId");
  const isSingleAnswer = questionType === "SINGLE_CHOICE" || questionType === "TRUE_FALSE";

  // Vrai/Faux : forcer les libellés et garder une seule bonne réponse à la fois.
  useEffect(() => {
    if (questionType !== "TRUE_FALSE") return;
    const current = watch("options");
    if (current.length !== 2 || current[0]?.label !== "Vrai" || current[1]?.label !== "Faux") {
      const hasCorrect = current.some((o) => o.correct);
      setValue("options", [
        { label: "Vrai", correct: hasCorrect ? !!current[0]?.correct : true, orderIndex: 0 },
        { label: "Faux", correct: hasCorrect ? !!current[1]?.correct : false, orderIndex: 1 },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to type switching
  }, [questionType]);

  function onSelectSingleCorrect(index: number) {
    fields.forEach((_, i) => setValue(`options.${i}.correct`, i === index, { shouldValidate: true }));
  }
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isChoiceType = questionType === "SINGLE_CHOICE" || questionType === "MULTI_CHOICE" || questionType === "TRUE_FALSE";

  useEffect(() => {
    if (!imageAssetId) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    resolveAssetUrl(String(imageAssetId))
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [imageAssetId]);

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadMedia(file, "IMAGE");
      setValue("imageAssetId", asset.id, { shouldValidate: true });
    } catch {
      window.alert("Impossible d’envoyer l’image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormSection title="Contenu de la question">
        <FormField label="Énoncé" error={errors.prompt} required>
          <textarea autoFocus className={fieldClass(!!errors.prompt)} rows={3} {...register("prompt")} />
        </FormField>

        <FormField
          label="Image d'illustration (optionnel)"
          error={errors.imageAssetId}
          hint="Affichée au-dessus des options pour l’apprenant"
        >
          <input type="hidden" {...register("imageAssetId")} />
          <div className="flex flex-wrap items-center gap-3">
            <label className={`${btn.neutralSm} cursor-pointer`}>
              {uploading ? "Envoi…" : previewUrl ? "Changer l’image" : "Ajouter une image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || busy}
                onChange={(e) => void onPickImage(e.target.files?.[0])}
              />
            </label>
            <button type="button" className={btn.secondarySm} onClick={() => setPickerOpen(true)}>
              Choisir une image existante
            </button>
            {imageAssetId && (
              <button
                type="button"
                className="text-xs text-[var(--danger)] hover:underline"
                onClick={() => setValue("imageAssetId", "", { shouldValidate: true })}
              >
                Retirer
              </button>
            )}
          </div>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Illustration question"
              className="mt-2 max-h-40 rounded-lg border border-theme"
            />
          )}
        </FormField>

        <FormField
          label="Type de question"
          error={errors.questionType}
          hint={
            quizQuestionMode === "OPEN_ENDED"
              ? "Ce quiz est en mode « réponse libre » : toutes ses questions sont à correction manuelle."
              : "Ce quiz est en mode « questions à choix » : jamais de réponse libre dans ce quiz."
          }
        >
          {quizQuestionMode === "OPEN_ENDED" ? (
            <p className={`${fieldClass()} bg-surface-2 text-muted`}>Réponse libre (correction manuelle)</p>
          ) : (
            <select className={fieldClass(!!errors.questionType)} {...register("questionType")}>
              <option value="SINGLE_CHOICE">Choix unique</option>
              <option value="MULTI_CHOICE">Choix multiple</option>
              <option value="TRUE_FALSE">Vrai / Faux</option>
            </select>
          )}
        </FormField>

        <FormField label="Explication (optionnel)" error={errors.explanation} hint="Affichée après la réponse pour justifier la correction">
          <input className={fieldClass(!!errors.explanation)} {...register("explanation")} />
        </FormField>
      </FormSection>

      {isChoiceType && (
        <div className="space-y-2.5 rounded-xl border border-theme bg-surface-2/40 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-heading">Options</p>
              <p className="text-xs text-muted">
                {isSingleAnswer ? "Sélectionnez la seule bonne réponse" : "Cochez une ou plusieurs bonnes réponses"}
              </p>
            </div>
            {questionType !== "TRUE_FALSE" && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-surface-2"
                onClick={() =>
                  append({
                    label: `Option ${fields.length + 1}`,
                    correct: false,
                    orderIndex: fields.length,
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Option
              </button>
            )}
          </div>
          {fields.map((field, index) => {
            const correct = !!watch(`options.${index}.correct`);
            return (
              <div
                key={field.id}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                  correct
                    ? "border-[var(--alert-success-fg)] bg-[var(--alert-success-bg)]"
                    : "border-theme bg-surface hover:border-[var(--ring)]"
                }`}
              >
                {isSingleAnswer ? (
                  <button
                    type="button"
                    className="shrink-0 text-[var(--alert-success-fg)]"
                    aria-label="Définir comme bonne réponse"
                    aria-pressed={correct}
                    onClick={() => onSelectSingleCorrect(index)}
                  >
                    {correct ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-muted" />}
                  </button>
                ) : (
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-[var(--alert-success-fg)]"
                    aria-label="Bonne réponse"
                    {...register(`options.${index}.correct`)}
                  />
                )}
                <input
                  className={`${fieldClass()} border-0 bg-transparent px-1 focus-visible:shadow-none`}
                  placeholder={`Option ${index + 1}`}
                  disabled={questionType === "TRUE_FALSE"}
                  {...register(`options.${index}.label`)}
                />
                <input type="hidden" {...register(`options.${index}.orderIndex`)} value={index} />
                {questionType !== "TRUE_FALSE" && fields.length > 2 && (
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-[var(--danger)]"
                    aria-label="Supprimer cette option"
                    title="Supprimer cette option"
                    onClick={() => remove(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
          {errors.options && (
            <p className="text-xs text-[var(--alert-error-fg)]">{errors.options.message || errors.options.root?.message}</p>
          )}
        </div>
      )}

      {questionType === "ESSAY" && (
        <FormField label="Longueur max (optionnel)" error={errors.essayMaxLength} hint="Nombre de caractères maximum autorisé dans la réponse">
          <input type="number" className={fieldClass(!!errors.essayMaxLength)} {...register("essayMaxLength")} />
          <p className="mt-1 text-xs text-muted">Cette question sera corrigée manuellement par un formateur.</p>
        </FormField>
      )}

      <button type="submit" disabled={busy || uploading} className={btn.primary}>
        {busy ? "…" : submitLabel}
      </button>

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(asset) => setValue("imageAssetId", asset.id, { shouldValidate: true })}
      />
    </form>
  );
}
