"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { questionFormSchema, type QuestionFormValues } from "./schemas";
import { FormField, inputClass } from "./FormField";
import { resolveAssetUrl, uploadMedia } from "@/lib/media";
import { btn } from "@/lib/ui";

type Props = {
  defaultValues?: Partial<QuestionFormValues>;
  busy?: boolean;
  submitLabel?: string;
  onSubmit: (values: QuestionFormValues) => Promise<void> | void;
};

export function QuestionForm({
  defaultValues,
  busy,
  submitLabel = "Ajouter la question",
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
    defaultValues: {
      prompt: "",
      questionType: "SINGLE_CHOICE",
      orderIndex: 0,
      explanation: "",
      imageAssetId: "",
      options: [
        { label: "Bonne réponse", correct: true, orderIndex: 0 },
        { label: "Mauvaise réponse", correct: false, orderIndex: 1 },
      ],
      matchingPairs: [
        { left: "", right: "" },
        { left: "", right: "" },
      ],
      hotspotZones: [{ x: 25, y: 25, width: 20, height: 20 }],
      fillBlankTemplate: "",
      fillBlankAcceptedAnswers: "",
      essayMaxLength: undefined,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "options" });
  const matching = useFieldArray({ control, name: "matchingPairs" });
  const hotspot = useFieldArray({ control, name: "hotspotZones" });
  const questionType = watch("questionType");
  const imageAssetId = watch("imageAssetId");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Énoncé" error={errors.prompt}>
        <textarea className={inputClass} rows={3} {...register("prompt")} />
      </FormField>

      <FormField
        label={questionType === "HOTSPOT" ? "Image (zone cliquable)" : "Image d'illustration (optionnel)"}
        error={errors.imageAssetId}
        hint={questionType === "HOTSPOT" ? "L'apprenant clique dessus pour répondre" : "Affichée au-dessus des options pour l’apprenant"}
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

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Type de question" error={errors.questionType}>
          <select className={inputClass} {...register("questionType")}>
            <option value="SINGLE_CHOICE">Choix unique</option>
            <option value="MULTI_CHOICE">Choix multiple</option>
            <option value="TRUE_FALSE">Vrai / Faux</option>
            <option value="MATCHING">Appariement (matching)</option>
            <option value="HOTSPOT">Zone cliquable (hotspot)</option>
            <option value="FILL_BLANK">Texte à trous</option>
            <option value="ESSAY">Réponse libre (correction manuelle)</option>
          </select>
        </FormField>
        <FormField label="Ordre" error={errors.orderIndex}>
          <input type="number" className={inputClass} {...register("orderIndex")} />
        </FormField>
      </div>

      <FormField label="Explication (optionnel)" error={errors.explanation}>
        <input className={inputClass} {...register("explanation")} />
      </FormField>

      {isChoiceType && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-heading">Options</p>
            {questionType !== "TRUE_FALSE" && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() =>
                  append({
                    label: `Option ${fields.length + 1}`,
                    correct: false,
                    orderIndex: fields.length,
                  })
                }
              >
                + Option
              </button>
            )}
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <input type="checkbox" {...register(`options.${index}.correct`)} />
              <input className={inputClass} {...register(`options.${index}.label`)} />
              <input type="hidden" {...register(`options.${index}.orderIndex`)} value={index} />
              {questionType !== "TRUE_FALSE" && fields.length > 2 && (
                <button type="button" className="text-xs text-[var(--danger)]" onClick={() => remove(index)}>
                  ✕
                </button>
              )}
            </div>
          ))}
          {errors.options && (
            <p className="text-xs text-[var(--alert-error-fg)]">{errors.options.message || errors.options.root?.message}</p>
          )}
        </div>
      )}

      {questionType === "MATCHING" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-heading">Paires à apparier</p>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => matching.append({ left: "", right: "" })}
            >
              + Paire
            </button>
          </div>
          {matching.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <input className={inputClass} placeholder="Élément" {...register(`matchingPairs.${index}.left`)} />
              <span className="text-muted">→</span>
              <input className={inputClass} placeholder="Correspond à" {...register(`matchingPairs.${index}.right`)} />
              {matching.fields.length > 2 && (
                <button type="button" className="text-xs text-[var(--danger)]" onClick={() => matching.remove(index)}>
                  ✕
                </button>
              )}
            </div>
          ))}
          {errors.matchingPairs && (
            <p className="text-xs text-[var(--alert-error-fg)]">{errors.matchingPairs.message}</p>
          )}
        </div>
      )}

      {questionType === "HOTSPOT" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-heading">Zone(s) cible(s) (% de l&apos;image)</p>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => hotspot.append({ x: 25, y: 25, width: 20, height: 20 })}
            >
              + Zone
            </button>
          </div>
          {hotspot.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-5 gap-2">
              <input type="number" className={inputClass} placeholder="X%" {...register(`hotspotZones.${index}.x`)} />
              <input type="number" className={inputClass} placeholder="Y%" {...register(`hotspotZones.${index}.y`)} />
              <input type="number" className={inputClass} placeholder="Largeur%" {...register(`hotspotZones.${index}.width`)} />
              <input type="number" className={inputClass} placeholder="Hauteur%" {...register(`hotspotZones.${index}.height`)} />
              {hotspot.fields.length > 1 && (
                <button type="button" className="text-xs text-[var(--danger)]" onClick={() => hotspot.remove(index)}>
                  ✕ retirer
                </button>
              )}
            </div>
          ))}
          <p className="text-xs text-muted">
            Seule la première zone sert de cible pour la correction automatique.
          </p>
        </div>
      )}

      {questionType === "FILL_BLANK" && (
        <div className="space-y-2">
          <FormField
            label="Modèle de phrase"
            error={errors.fillBlankTemplate}
            hint="Utilisez ___ pour marquer le trou (affichage uniquement)"
          >
            <input className={inputClass} {...register("fillBlankTemplate")} placeholder="Le ciel est ___." />
          </FormField>
          <FormField
            label="Réponses acceptées"
            error={errors.fillBlankAcceptedAnswers}
            hint="Séparées par des virgules — insensible à la casse et aux accents"
          >
            <input className={inputClass} {...register("fillBlankAcceptedAnswers")} placeholder="bleu, azur" />
          </FormField>
        </div>
      )}

      {questionType === "ESSAY" && (
        <FormField label="Longueur max (optionnel)" error={errors.essayMaxLength}>
          <input type="number" className={inputClass} {...register("essayMaxLength")} />
          <p className="mt-1 text-xs text-muted">Cette question sera corrigée manuellement par un formateur.</p>
        </FormField>
      )}

      <button type="submit" disabled={busy || uploading} className={btn.primary}>
        {busy ? "…" : submitLabel}
      </button>
    </form>
  );
}
