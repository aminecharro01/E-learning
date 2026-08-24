"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quizSettingsSchema, type QuizSettingsValues } from "./schemas";
import { FormField, FormSection, Toggle, fieldClass } from "./FormField";
import { getModule, listQuestionBanks, type QuestionBank } from "@/lib/api";
import type { Lesson, Module } from "@/types/domain";
import { moduleSelectGroups } from "@/lib/programme";
import { btn } from "@/lib/ui";

type Props = {
  modules: Module[];
  defaultValues?: Partial<QuizSettingsValues>;
  busy?: boolean;
  onSubmit: (values: QuizSettingsValues) => Promise<void> | void;
};

export function QuizSettingsForm({ modules, defaultValues, busy, onSubmit }: Props) {
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
      moduleId: modules[0]?.id ?? "",
      lessonId: "",
      ufCode: "",
      yearNumber: undefined,
      passingScore: 60,
      maxAttempts: 2,
      timeLimitSeconds: 5400,
      randomizeQuestions: true,
      randomizeOptions: true,
      retryDelayHours: 24,
      blocking: true,
      published: true,
      proctoringEnabled: false,
      focusLossDetection: false,
      copyProtection: false,
      lockdownMode: false,
      drawFromBankId: "",
      drawCount: undefined,
      ...defaultValues,
    },
  });

  const quizType = watch("quizType");
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
  const [banks, setBanks] = useState<QuestionBank[]>([]);

  useEffect(() => {
    listQuestionBanks()
      .then(setBanks)
      .catch(() => setBanks([]));
  }, []);

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
          <FormField label="Délai entre tentatives (h)" error={errors.retryDelayHours}>
            <input
              type="number"
              min={0}
              className={fieldClass(!!errors.retryDelayHours)}
              {...register("retryDelayHours")}
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

      {banks.length > 0 && (
        <FormSection title="Génération automatique" description="Optionnel — laissez vide pour créer un quiz vide">
          <FormField
            label="Générer depuis une banque"
            hint="Tire au hasard N questions dans une banque"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <select className={fieldClass()} {...register("drawFromBankId")}>
                <option value="">— Aucune —</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.questionCount})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className={fieldClass()}
                placeholder="Nombre de questions"
                {...register("drawCount")}
              />
            </div>
          </FormField>
        </FormSection>
      )}

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
        {busy ? "Création…" : "Créer le quiz"}
      </button>
    </form>
  );
}

function TypeCard({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`type-card ${active ? "type-card-active" : ""}`}
    >
      <p className="text-sm font-semibold text-heading">{title}</p>
      <p className="mt-0.5 text-xs text-muted">{desc}</p>
    </button>
  );
}
