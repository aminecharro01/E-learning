"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quizSettingsSchema, type QuizSettingsValues } from "./schemas";
import { FormField, FormSection, Toggle, fieldClass } from "./FormField";
import { getModule } from "@/lib/api";
import type { Lesson, Module } from "@/types/domain";
import { moduleSelectGroups } from "@/lib/programme";
import { btn } from "@/lib/ui";

type Props = {
  modules: Module[];
  defaultValues?: Partial<QuizSettingsValues>;
  busy?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  /** Le quiz contient déjà des questions — le mode ne peut plus changer (verrouillé côté backend aussi). */
  questionModeLocked?: boolean;
  onSubmit: (values: QuizSettingsValues) => Promise<void> | void;
};

export function QuizSettingsForm({
  modules,
  defaultValues,
  busy,
  submitLabel = "Créer le quiz",
  submittingLabel = "Création…",
  questionModeLocked = false,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuizSettingsValues>({
    resolver: zodResolver(quizSettingsSchema) as Resolver<QuizSettingsValues>,
    mode: "onBlur",
    defaultValues: {
      title: "Évaluation finale du module",
      quizType: "FIN_MODULE",
      questionMode: "AUTO_GRADED",
      moduleId: modules[0]?.id ?? "",
      lessonId: "",
      ufCode: "",
      yearNumber: undefined,
      passingScore: 60,
      maxAttempts: 2,
      timeLimitSeconds: 5400,
      randomizeQuestions: true,
      randomizeOptions: true,
      retryDelayMinutes: 1440,
      blocking: true,
      published: true,
      proctoringEnabled: false,
      focusLossDetection: false,
      copyProtection: false,
      lockdownMode: false,
      ...defaultValues,
    },
  });

  const quizType = watch("quizType");
  const questionMode = watch("questionMode");
  const moduleId = watch("moduleId");
  const lessonId = watch("lessonId");
  const ufCode = watch("ufCode");
  const timeLimitSeconds = watch("timeLimitSeconds");

  const ufOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of modules) {
      if (m.ufCode) seen.set(m.ufCode, m.ufTitle || m.ufCode);
    }
    return Array.from(seen.entries()).map(([code, title]) => ({ ufCode: code, ufTitle: title }));
  }, [modules]);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<string | null>(null);

  const timeMinutes = useMemo(
    () => Math.round((Number(timeLimitSeconds) || 0) / 60),
    [timeLimitSeconds]
  );

  // Load sections when module changes (for APPLICATIF picker)
  useEffect(() => {
    if (!moduleId) {
      setLessons([]);
      return;
    }
    let cancelled = false;
    setLessonsLoading(true);
    setLessonsError(null);
    getModule(moduleId)
      .then((mod) => {
        if (cancelled) return;
        const list = (mod.lessons || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
        setLessons(list);
        // Keep lessonId only if it belongs to this module
        if (lessonId && !list.some((l) => l.id === lessonId)) {
          setValue("lessonId", "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLessons([]);
          setLessonsError("Impossible de charger les sections de ce module.");
        }
      })
      .finally(() => {
        if (!cancelled) setLessonsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload on module change
  }, [moduleId, setValue]);

  // Sensible default title when switching type / selection
  useEffect(() => {
    if (quizType === "FIN_MODULE") {
      const mod = modules.find((m) => m.id === moduleId);
      if (mod) {
        setValue("title", `Quiz — ${mod.title}`);
      }
    } else if (quizType === "APPLICATIF" && lessonId) {
      const lesson = lessons.find((l) => l.id === lessonId);
      if (lesson) {
        setValue("title", `Quiz section — ${lesson.title}`);
      }
    } else if (quizType === "FIN_UF" && ufCode) {
      const uf = ufOptions.find((u) => u.ufCode === ufCode);
      if (uf) {
        setValue("title", `Quiz de fin d'UF — ${uf.ufTitle}`);
      }
    } else if (quizType === "FIN_ANNEE") {
      setValue("title", "Examen de fin d'année");
    }
  }, [quizType, moduleId, lessonId, ufCode, modules, lessons, ufOptions, setValue]);

  function onTimeMinutesChange(minutes: number) {
    const safe = Number.isFinite(minutes) && minutes >= 0 ? minutes : 0;
    setValue("timeLimitSeconds", safe * 60, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormSection title="Type & portée">
        <FormField label="Type d'évaluation" error={errors.quizType}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <TypeCard
              active={quizType === "FIN_MODULE"}
              title="Fin de module"
              desc="Après toutes les sections"
              onClick={() => setValue("quizType", "FIN_MODULE", { shouldValidate: true })}
            />
            <TypeCard
              active={quizType === "APPLICATIF"}
              title="Quiz de section"
              desc="Lié à une section précise"
              onClick={() => setValue("quizType", "APPLICATIF", { shouldValidate: true })}
            />
            <TypeCard
              active={quizType === "FIN_UF"}
              title="Fin d'UF"
              desc="Après toute une unité de formation"
              onClick={() => setValue("quizType", "FIN_UF", { shouldValidate: true })}
            />
            <TypeCard
              active={quizType === "FIN_ANNEE"}
              title="Fin d'année"
              desc="Examen de fin d'année 1 ou 2"
              onClick={() => setValue("quizType", "FIN_ANNEE", { shouldValidate: true })}
            />
          </div>
          <input type="hidden" {...register("quizType")} />
        </FormField>

        <FormField
          label="Mode de correction"
          error={errors.questionMode}
          hint={
            questionModeLocked
              ? "Verrouillé — ce quiz contient déjà des questions."
              : "Fixé à la création : un quiz ne mélange jamais les deux modes."
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <TypeCard
              active={questionMode === "AUTO_GRADED"}
              disabled={questionModeLocked}
              title="Questions à choix"
              desc="Choix unique, multiple, vrai/faux — score calculé immédiatement"
              onClick={() =>
                !questionModeLocked && setValue("questionMode", "AUTO_GRADED", { shouldValidate: true })
              }
            />
            <TypeCard
              active={questionMode === "OPEN_ENDED"}
              disabled={questionModeLocked}
              title="Réponse libre"
              desc="Correction manuelle — score affiché une fois corrigé"
              onClick={() =>
                !questionModeLocked && setValue("questionMode", "OPEN_ENDED", { shouldValidate: true })
              }
            />
          </div>
          <input type="hidden" {...register("questionMode")} />
        </FormField>

        {(quizType === "APPLICATIF" || quizType === "FIN_MODULE") && (
          <FormField
            label="Module"
            error={errors.moduleId}
            hint={
              quizType === "APPLICATIF"
                ? "Choisissez d’abord le module, puis la section"
                : "Module concerné par l’évaluation finale"
            }
          >
            <select className={fieldClass(!!errors.moduleId)} {...register("moduleId")}>
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
          </FormField>
        )}

        {quizType === "FIN_UF" && (
          <FormField
            label="Unité de formation"
            error={errors.ufCode}
            hint="Déduite des UF déjà utilisées sur les modules existants"
          >
            <select className={fieldClass(!!errors.ufCode)} {...register("ufCode")}>
              <option value="">— Sélectionner une UF —</option>
              {ufOptions.map((u) => (
                <option key={u.ufCode} value={u.ufCode}>
                  {u.ufTitle}
                </option>
              ))}
            </select>
            {ufOptions.length === 0 && (
              <p className="mt-1 text-xs text-muted">
                Aucune UF trouvée — renseignez d’abord un code UF sur au moins un module.
              </p>
            )}
          </FormField>
        )}

        {quizType === "FIN_ANNEE" && (
          <FormField label="Année" error={errors.yearNumber}>
            <select className={fieldClass(!!errors.yearNumber)} {...register("yearNumber")}>
              <option value="">— Sélectionner une année —</option>
              <option value={1}>Année 1</option>
              <option value={2}>Année 2</option>
            </select>
          </FormField>
        )}

        {quizType === "APPLICATIF" && (
          <FormField
            label="Section"
            error={errors.lessonId}
            hint={
              lessonsLoading
                ? "Chargement des sections…"
                : lessons.length === 0
                  ? "Aucune section publiée dans ce module"
                  : undefined
            }
          >
            <select
              className={fieldClass(!!errors.lessonId)}
              {...register("lessonId")}
              disabled={lessonsLoading || lessons.length === 0}
            >
              <option value="">— Sélectionner une section —</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.orderIndex + 1}. {l.title}
                  {!l.published ? " (brouillon)" : ""}
                </option>
              ))}
            </select>
            {lessonsError && <p className="mt-1 text-xs text-[var(--alert-error-fg)]">{lessonsError}</p>}
          </FormField>
        )}

        <FormField label="Titre du quiz" error={errors.title} required>
          <input className={fieldClass(!!errors.title)} {...register("title")} />
        </FormField>
      </FormSection>

      <FormSection title="Règles de passage">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Score minimum (%)" error={errors.passingScore}>
            <input
              type="number"
              min={0}
              max={100}
              className={fieldClass(!!errors.passingScore)}
              {...register("passingScore")}
            />
          </FormField>
          <FormField label="Tentatives max" error={errors.maxAttempts}>
            <input
              type="number"
              min={1}
              max={20}
              className={fieldClass(!!errors.maxAttempts)}
              {...register("maxAttempts")}
            />
          </FormField>
          <FormField label="Durée (minutes)" error={errors.timeLimitSeconds} hint="0 = illimité">
            <input
              type="number"
              min={0}
              className={fieldClass(!!errors.timeLimitSeconds)}
              value={timeMinutes}
              onChange={(e) => onTimeMinutesChange(Number(e.target.value))}
            />
            <input type="hidden" {...register("timeLimitSeconds")} />
          </FormField>
          <FormField label="Délai entre tentatives (min)" error={errors.retryDelayMinutes}>
            <input
              type="number"
              min={0}
              className={fieldClass(!!errors.retryDelayMinutes)}
              {...register("retryDelayMinutes")}
            />
          </FormField>
        </div>

        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <Toggle label="Mélanger les questions" registration={register("randomizeQuestions")} />
          <Toggle label="Mélanger les options" registration={register("randomizeOptions")} />
          <Toggle
            label="Bloquant"
            description="L'apprenant doit réussir pour continuer le parcours"
            registration={register("blocking")}
          />
          <Toggle
            label="Publié"
            description="Visible par les apprenants dès l'enregistrement"
            registration={register("published")}
          />
        </div>
      </FormSection>

      <details className="rounded-xl border border-theme">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-heading">
          Anti-triche <span className="font-normal text-muted">(optionnel — désactivé par défaut)</span>
        </summary>
        <div className="grid gap-x-6 gap-y-1 border-t border-theme px-4 py-3 sm:grid-cols-2">
          <Toggle label="Activer la surveillance" registration={register("proctoringEnabled")} />
          <Toggle label="Détecter perte de focus" registration={register("focusLossDetection")} />
          <Toggle label="Bloquer copier-coller" registration={register("copyProtection")} />
          <Toggle label="Verrouillage plein écran" registration={register("lockdownMode")} />
        </div>
      </details>

      <button
        type="submit"
        disabled={busy || (quizType === "APPLICATIF" && !lessonId)}
        className={`${btn.blockPrimary} sm:w-auto`}
      >
        {busy ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}

function TypeCard({
  active,
  title,
  desc,
  onClick,
  disabled,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`type-card ${active ? "type-card-active" : ""} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <p className="text-sm font-semibold text-heading">{title}</p>
      <p className="mt-0.5 text-xs text-muted">{desc}</p>
    </button>
  );
}
