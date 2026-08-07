"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quizSettingsSchema, type QuizSettingsValues } from "./schemas";
import { FormField, inputClass } from "./FormField";
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
    defaultValues: {
      title: "Évaluation finale du module",
      quizType: "FIN_MODULE",
      moduleId: modules[0]?.id ?? "",
      lessonId: "",
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
  const timeLimitSeconds = watch("timeLimitSeconds");

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
    }
  }, [quizType, moduleId, lessonId, modules, lessons, setValue]);

  function onTimeMinutesChange(minutes: number) {
    const safe = Number.isFinite(minutes) && minutes >= 0 ? minutes : 0;
    setValue("timeLimitSeconds", safe * 60, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormField label="Type d'évaluation" error={errors.quizType}>
        <div className="grid gap-2 sm:grid-cols-2">
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
        </div>
        <input type="hidden" {...register("quizType")} />
      </FormField>

      <FormField
        label="Module"
        error={errors.moduleId}
        hint={
          quizType === "APPLICATIF"
            ? "Choisissez d’abord le module, puis la section"
            : "Module concerné par l’évaluation finale"
        }
      >
        <select className={inputClass} {...register("moduleId")}>
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
            className={inputClass}
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

      <FormField label="Titre du quiz" error={errors.title}>
        <input className={inputClass} {...register("title")} />
      </FormField>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Score minimum (%)" error={errors.passingScore}>
          <input type="number" min={0} max={100} className={inputClass} {...register("passingScore")} />
        </FormField>
        <FormField label="Tentatives max" error={errors.maxAttempts}>
          <input type="number" min={1} max={20} className={inputClass} {...register("maxAttempts")} />
        </FormField>
        <FormField
          label="Durée (minutes)"
          error={errors.timeLimitSeconds}
          hint="0 = illimité"
        >
          <input
            type="number"
            min={0}
            className={inputClass}
            value={timeMinutes}
            onChange={(e) => onTimeMinutesChange(Number(e.target.value))}
          />
          <input type="hidden" {...register("timeLimitSeconds")} />
        </FormField>
        <FormField label="Délai entre tentatives (h)" error={errors.retryDelayHours}>
          <input type="number" min={0} className={inputClass} {...register("retryDelayHours")} />
        </FormField>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-body">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("randomizeQuestions")} /> Mélanger questions
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("randomizeOptions")} /> Mélanger options
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("blocking")} /> Bloquant
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("published")} /> Publié
        </label>
      </div>

      {banks.length > 0 && (
        <FormField
          label="Générer depuis une banque (optionnel)"
          hint="Tire au hasard N questions dans une banque — laissez vide pour créer un quiz vide"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={inputClass} {...register("drawFromBankId")}>
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
              className={inputClass}
              placeholder="Nombre de questions"
              {...register("drawCount")}
            />
          </div>
        </FormField>
      )}

      <FormField
        label="Anti-triche (optionnel)"
        hint="Désactivé par défaut — à activer explicitement pour un examen surveillé."
      >
        <div className="flex flex-wrap gap-4 text-sm text-body">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("proctoringEnabled")} /> Activer la surveillance
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("focusLossDetection")} /> Détecter perte de focus
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("copyProtection")} /> Bloquer copier-coller
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("lockdownMode")} /> Verrouillage plein écran
          </label>
        </div>
      </FormField>

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
