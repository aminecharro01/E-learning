"use client";

import { useEffect, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, ArrowRight } from "lucide-react";
import { questionFormSchema, type QuestionFormValues } from "./schemas";
import { FormField, FormSection, fieldClass } from "./FormField";
import { resolveAssetUrl, uploadMedia } from "@/lib/media";
import { AssetPicker } from "@/components/admin/AssetPicker";
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
    mode: "onBlur",
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
          label={questionType === "HOTSPOT" ? "Image (zone cliquable)" : "Image d'illustration (optionnel)"}
          error={errors.imageAssetId}
          required={questionType === "HOTSPOT"}
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

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Type de question" error={errors.questionType}>
            <select className={fieldClass(!!errors.questionType)} {...register("questionType")}>
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
            <input type="number" className={fieldClass(!!errors.orderIndex)} {...register("orderIndex")} />
          </FormField>
        </div>

        <FormField label="Explication (optionnel)" error={errors.explanation} hint="Affichée après la réponse pour justifier la correction">
          <input className={fieldClass(!!errors.explanation)} {...register("explanation")} />
        </FormField>
      </FormSection>

      {isChoiceType && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-heading">Options</p>
              <p className="text-xs text-muted">Cochez la ou les bonnes réponses</p>
            </div>
            {questionType !== "TRUE_FALSE" && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
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
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                watch(`options.${index}.correct`)
                  ? "border-[var(--alert-success-fg)] bg-[var(--alert-success-bg)]"
                  : "border-theme"
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0"
                aria-label="Bonne réponse"
                {...register(`options.${index}.correct`)}
              />
              <input
                className={`${fieldClass()} border-0 bg-transparent px-1 focus-visible:shadow-none`}
                placeholder={`Option ${index + 1}`}
                {...register(`options.${index}.label`)}
              />
              <input type="hidden" {...register(`options.${index}.orderIndex`)} value={index} />
              {questionType !== "TRUE_FALSE" && fields.length > 2 && (
                <button
                  type="button"
                  className="shrink-0 rounded p-1 text-muted hover:bg-surface-2 hover:text-[var(--danger)]"
                  aria-label="Supprimer cette option"
                  onClick={() => remove(index)}
                >
                  <X className="h-3.5 w-3.5" />
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
            <p className="text-sm font-semibold text-heading">Paires à apparier</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              onClick={() => matching.append({ left: "", right: "" })}
            >
              <Plus className="h-3.5 w-3.5" /> Paire
            </button>
          </div>
          {matching.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <input className={fieldClass()} placeholder="Élément" {...register(`matchingPairs.${index}.left`)} />
              <span className="text-muted" aria-hidden>
                <ArrowRight size={16} />
              </span>
              <input className={fieldClass()} placeholder="Correspond à" {...register(`matchingPairs.${index}.right`)} />
              {matching.fields.length > 2 && (
                <button
                  type="button"
                  className="shrink-0 rounded p-1 text-muted hover:bg-surface-2 hover:text-[var(--danger)]"
                  aria-label="Supprimer cette paire"
                  onClick={() => matching.remove(index)}
                >
                  <X className="h-3.5 w-3.5" />
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
          <p className="text-sm font-semibold text-heading">Zone(s) cible(s)</p>
          {previewUrl ? (
            <HotspotZoneDrawer
              imageUrl={previewUrl}
              zones={hotspot.fields.map((f, i) => ({
                x: watch(`hotspotZones.${i}.x`),
                y: watch(`hotspotZones.${i}.y`),
                width: watch(`hotspotZones.${i}.width`),
                height: watch(`hotspotZones.${i}.height`),
              }))}
              onAdd={(zone) => hotspot.append(zone)}
              onRemove={(index) => hotspot.remove(index)}
            />
          ) : (
            <p className="text-xs text-muted">Ajoutez d&apos;abord une image ci-dessus pour dessiner les zones directement dessus.</p>
          )}

          <details className="text-xs">
            <summary className="cursor-pointer text-muted hover:text-heading">Ajustement précis (%, avancé)</summary>
            <div className="mt-2 space-y-2">
              {hotspot.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-5 items-center gap-2">
                  <input type="number" className={fieldClass()} placeholder="X%" {...register(`hotspotZones.${index}.x`)} />
                  <input type="number" className={fieldClass()} placeholder="Y%" {...register(`hotspotZones.${index}.y`)} />
                  <input type="number" className={fieldClass()} placeholder="Largeur%" {...register(`hotspotZones.${index}.width`)} />
                  <input type="number" className={fieldClass()} placeholder="Hauteur%" {...register(`hotspotZones.${index}.height`)} />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1 rounded p-1.5 text-[var(--danger)] hover:bg-surface-2"
                    aria-label="Supprimer cette zone"
                    onClick={() => hotspot.remove(index)}
                  >
                    <X className="h-3.5 w-3.5" /> retirer
                  </button>
                </div>
              ))}
            </div>
          </details>

          <p className="text-xs text-muted">
            Le clic de l&apos;apprenant est considéré correct s&apos;il tombe dans l&apos;une de ces zones — vous pouvez en
            dessiner plusieurs si plusieurs endroits sont valides.
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
            <input className={fieldClass(!!errors.fillBlankTemplate)} {...register("fillBlankTemplate")} placeholder="Le ciel est ___." />
          </FormField>
          <FormField
            label="Réponses acceptées"
            error={errors.fillBlankAcceptedAnswers}
            hint="Séparées par des virgules — insensible à la casse et aux accents"
          >
            <input
              className={fieldClass(!!errors.fillBlankAcceptedAnswers)}
              {...register("fillBlankAcceptedAnswers")}
              placeholder="bleu, azur"
            />
          </FormField>
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

type Zone = { x: number; y: number; width: number; height: number };
type Rect = { x: number; y: number; width: number; height: number };

/**
 * Dessin direct des zones sur l'image (clic-glisser) au lieu de coordonnées
 * saisies à l'aveugle — l'admin voit exactement ce que l'apprenant verra.
 * Pas de nouvelle dépendance : mêmes calculs getBoundingClientRect() que
 * HotspotClickImage côté apprenant (frontend/src/app/app/learn/.../quiz/[quizId]/page.tsx).
 */
function HotspotZoneDrawer({
  imageUrl,
  zones,
  onAdd,
  onRemove,
}: {
  imageUrl: string;
  zones: Zone[];
  onAdd: (zone: Zone) => void;
  onRemove: (index: number) => void;
}) {
  const [draft, setDraft] = useState<Rect | null>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  function pointFromEvent(
    e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>,
    el: HTMLDivElement
  ) {
    const rect = el.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    return { x: Math.min(Math.max(x, 0), 100), y: Math.min(Math.max(y, 0), 100) };
  }

  function toRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
    return {
      x: Math.round(Math.min(a.x, b.x)),
      y: Math.round(Math.min(a.y, b.y)),
      width: Math.round(Math.abs(b.x - a.x)),
      height: Math.round(Math.abs(b.y - a.y)),
    };
  }

  function onDown(e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>) {
    const p = pointFromEvent(e, e.currentTarget);
    setStart(p);
    setDraft({ x: p.x, y: p.y, width: 0, height: 0 });
  }

  function onMove(e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>) {
    if (!start) return;
    const p = pointFromEvent(e, e.currentTarget);
    setDraft(toRect(start, p));
  }

  function onUp() {
    if (draft && draft.width >= 2 && draft.height >= 2) {
      onAdd({ x: draft.x, y: draft.y, width: Math.max(draft.width, 1), height: Math.max(draft.height, 1) });
    }
    setStart(null);
    setDraft(null);
  }

  return (
    <div className="space-y-1">
      <div
        className="relative inline-block max-w-full cursor-crosshair select-none touch-none"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={() => {
          setStart(null);
          setDraft(null);
        }}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Illustration — cliquez-glissez pour dessiner une zone" className="max-h-80 w-auto rounded-lg" draggable={false} />
        {zones.map((z, i) => (
          <div
            key={i}
            className="absolute rounded border-2 border-[var(--gold-600)] bg-[var(--gold-500)]/20"
            style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.width}%`, height: `${z.height}%` }}
          >
            <span className="absolute -top-5 left-0 rounded bg-[var(--gold-600)] px-1 text-[10px] font-semibold text-white">
              Cible {i + 1}
            </span>
            <button
              type="button"
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--danger)] text-[10px] text-white"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              aria-label="Retirer cette zone"
            >
              <X size={10} aria-hidden />
            </button>
          </div>
        ))}
        {draft && (
          <div
            className="pointer-events-none absolute rounded border-2 border-dashed border-[var(--primary)]"
            style={{ left: `${draft.x}%`, top: `${draft.y}%`, width: `${draft.width}%`, height: `${draft.height}%` }}
          />
        )}
      </div>
      <p className="text-xs text-muted">
        Cliquez-glissez sur l&apos;image pour dessiner une zone. La première zone dessinée est celle utilisée pour la correction.
      </p>
    </div>
  );
}
