"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  changePassword,
  getAppSettings,
  getQuizSettings,
  updateAppSettings,
  updateQuizSettings,
  type AppSettings,
} from "@/lib/api";
import {
  quizDefaultsSchema,
  type QuizDefaultsValues,
} from "@/components/admin/forms/schemas";
import { FormField, inputClass } from "@/components/admin/forms/FormField";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { useAuth } from "@/hooks/useAuth";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Requis"),
    newPassword: z.string().min(8, "8 caractères minimum").max(100),
    confirmPassword: z.string().min(8, "8 caractères minimum"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

const THEME_PRESETS = [
  { id: "navy-gold", label: "Navy & Or", swatch: ["#142b4b", "#e08d1b"] },
  { id: "ocean-teal", label: "Océan & Sarcelle", swatch: ["#0c343a", "#0d9488"] },
  { id: "sunset-amber", label: "Coucher & Ambre", swatch: ["#431407", "#ea580c"] },
] as const;

const appSchema = z.object({
  platformName: z.string().trim().min(2).max(120),
  supportEmail: z.string().trim().email("Courriel invalide").or(z.literal("")),
  registrationEnabled: z.boolean(),
  defaultResetPassword: z.string().min(8).max(100),
  year2OpeningDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide (AAAA-MM-JJ)"),
  themeVariant: z.string().min(1),
});

type AppValues = z.infer<typeof appSchema>;

type Tab = "password" | "app" | "quiz";

export default function AdminSettingsPage() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("password");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema) as Resolver<PasswordValues>,
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const appForm = useForm<AppValues>({
    resolver: zodResolver(appSchema) as Resolver<AppValues>,
  });

  const quizForm = useForm<QuizDefaultsValues>({
    resolver: zodResolver(quizDefaultsSchema) as Resolver<QuizDefaultsValues>,
  });

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    Promise.all([isSuperAdmin ? getAppSettings() : Promise.resolve(null), getQuizSettings()])
      .then(([app, quiz]) => {
        if (app) appForm.reset(app);
        quizForm.reset(quiz);
      })
      .catch((err) =>
        setError(err instanceof ApiClientError ? err.message : "Impossible de charger les paramètres.")
      )
      .finally(() => setLoading(false));
  }, [isAdmin, isSuperAdmin, appForm, quizForm]);

  async function onChangePassword(values: PasswordValues) {
    setError(null);
    setMsg(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      passwordForm.reset();
      setMsg("Mot de passe mis à jour.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Changement impossible.");
    }
  }

  async function onSaveApp(values: AppValues) {
    setError(null);
    setMsg(null);
    try {
      const saved = await updateAppSettings(values as AppSettings);
      appForm.reset(saved);
      document.documentElement.dataset.themeVariant = saved.themeVariant;
      setMsg("Paramètres application enregistrés.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Enregistrement impossible.");
    }
  }

  async function onSaveQuiz(values: QuizDefaultsValues) {
    setError(null);
    setMsg(null);
    try {
      const saved = await updateQuizSettings(values);
      quizForm.reset(saved);
      setMsg("Paramètres quiz enregistrés.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Enregistrement impossible.");
    }
  }

  const tabs: { id: Tab; label: string; adminOnly?: boolean; superAdminOnly?: boolean }[] = [
    { id: "password", label: "Mot de passe" },
    { id: "app", label: "Application", superAdminOnly: true },
    { id: "quiz", label: "Quiz (défauts)", adminOnly: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Paramètres</h1>
        <p className="mt-1 text-sm text-muted">
          Compte, plateforme et valeurs par défaut quiz
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-theme pb-3">
        {tabs
          .filter((t) => (!t.adminOnly || isAdmin) && (!t.superAdminOnly || isSuperAdmin))
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setError(null);
                setMsg(null);
              }}
              className={`tab-pill px-3 py-2 text-sm font-medium ${
                tab === t.id ? "tab-pill-active" : ""
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {msg && <p className="alert alert-success">{msg}</p>}

      {tab === "password" && (
        <ComponentCard
          title="Changer mon mot de passe"
          desc="Accessible à ADMIN et FORMATEUR connectés"
        >
          <form
            onSubmit={passwordForm.handleSubmit(onChangePassword)}
            className="max-w-md space-y-4"
          >
            <FormField
              label="Mot de passe actuel"
              error={passwordForm.formState.errors.currentPassword}
            >
              <input
                type="password"
                autoComplete="current-password"
                className={inputClass}
                {...passwordForm.register("currentPassword")}
              />
            </FormField>
            <FormField
              label="Nouveau mot de passe"
              error={passwordForm.formState.errors.newPassword}
            >
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                {...passwordForm.register("newPassword")}
              />
            </FormField>
            <FormField
              label="Confirmer"
              error={passwordForm.formState.errors.confirmPassword}
            >
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                {...passwordForm.register("confirmPassword")}
              />
            </FormField>
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className={btn.primary}
            >
              {passwordForm.formState.isSubmitting ? "…" : "Mettre à jour"}
            </button>
          </form>
        </ComponentCard>
      )}

      {tab === "app" && isSuperAdmin && (
        <ComponentCard
          title="Paramètres application"
          desc="Nom, support, inscriptions, rentrée année 2, mot de passe temporaire"
        >
          {loading ? (
            <p className="text-sm text-muted">Chargement…</p>
          ) : (
            <form onSubmit={appForm.handleSubmit(onSaveApp)} className="max-w-xl space-y-4">
              <FormField label="Nom de la plateforme" error={appForm.formState.errors.platformName}>
                <input className={inputClass} {...appForm.register("platformName")} />
              </FormField>
              <FormField label="Courriel support" error={appForm.formState.errors.supportEmail}>
                <input
                  type="email"
                  className={inputClass}
                  {...appForm.register("supportEmail")}
                />
              </FormField>
              <FormField
                label="Date de rentrée année 2"
                error={appForm.formState.errors.year2OpeningDate}
                hint="Ouverture automatique de l'année 2 à cette date pour les apprenants ayant terminé l'année 1 (UF 5 validée). Laisser vide pour désactiver."
              >
                <input
                  type="date"
                  className={inputClass}
                  {...appForm.register("year2OpeningDate")}
                />
              </FormField>
              <FormField
                label="Mot de passe temporaire (reset apprenant)"
                error={appForm.formState.errors.defaultResetPassword}
                hint="Utilisé quand un admin réinitialise le mot de passe d’un apprenant"
              >
                <input
                  className={inputClass}
                  {...appForm.register("defaultResetPassword")}
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-body">
                <input type="checkbox" {...appForm.register("registrationEnabled")} />
                Autoriser les nouvelles inscriptions
              </label>
              <FormField label="Thème de la plateforme">
                <div className="flex flex-wrap gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const active = appForm.watch("themeVariant") === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          appForm.setValue("themeVariant", preset.id, { shouldDirty: true })
                        }
                        className={`card-theme flex flex-col items-center gap-2 rounded-xl p-3 text-xs font-medium ${
                          active ? "ring-2 ring-[var(--ring)]" : ""
                        }`}
                        aria-pressed={active}
                      >
                        <span className="flex overflow-hidden rounded-full border border-theme">
                          {preset.swatch.map((color) => (
                            <span key={color} className="h-6 w-6" style={{ background: color }} />
                          ))}
                        </span>
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </FormField>
              <button
                type="submit"
                disabled={appForm.formState.isSubmitting}
                className={btn.primary}
              >
                {appForm.formState.isSubmitting ? "…" : "Enregistrer"}
              </button>
            </form>
          )}
        </ComponentCard>
      )}

      {tab === "quiz" && isAdmin && (
        <ComponentCard
          title="Défauts quiz / progression"
          desc="Appliqués à la création de nouveaux quiz"
        >
          {loading ? (
            <p className="text-sm text-muted">Chargement…</p>
          ) : (
            <form
              onSubmit={quizForm.handleSubmit(onSaveQuiz)}
              className="max-w-xl space-y-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label="Score section (%)"
                  error={quizForm.formState.errors.defaultSectionPassingScore}
                >
                  <input
                    type="number"
                    className={inputClass}
                    {...quizForm.register("defaultSectionPassingScore")}
                  />
                </FormField>
                <FormField
                  label="Score fin de module (%)"
                  error={quizForm.formState.errors.defaultModulePassingScore}
                >
                  <input
                    type="number"
                    className={inputClass}
                    {...quizForm.register("defaultModulePassingScore")}
                  />
                </FormField>
                <FormField
                  label="Tentatives max (module)"
                  error={quizForm.formState.errors.defaultModuleMaxAttempts}
                >
                  <input
                    type="number"
                    className={inputClass}
                    {...quizForm.register("defaultModuleMaxAttempts")}
                  />
                </FormField>
                <FormField
                  label="Durée module (secondes)"
                  error={quizForm.formState.errors.defaultModuleTimeLimitSeconds}
                >
                  <input
                    type="number"
                    className={inputClass}
                    {...quizForm.register("defaultModuleTimeLimitSeconds")}
                  />
                </FormField>
                <FormField
                  label="Délai retry (minutes)"
                  error={quizForm.formState.errors.defaultRetryDelayMinutes}
                >
                  <input
                    type="number"
                    className={inputClass}
                    {...quizForm.register("defaultRetryDelayMinutes")}
                  />
                </FormField>
                <FormField
                  label="Seuil vidéo section (%)"
                  error={quizForm.formState.errors.sectionCompletionVideoPercent}
                >
                  <input
                    type="number"
                    className={inputClass}
                    {...quizForm.register("sectionCompletionVideoPercent")}
                  />
                </FormField>
              </div>
              <button
                type="submit"
                disabled={quizForm.formState.isSubmitting}
                className={btn.primary}
              >
                {quizForm.formState.isSubmitting ? "…" : "Enregistrer"}
              </button>
            </form>
          )}
        </ComponentCard>
      )}

      {tab === "app" && !isSuperAdmin && (
        <p className="text-sm text-muted">Réservé au Super Admin.</p>
      )}
      {tab === "quiz" && !isAdmin && (
        <p className="text-sm text-muted">Réservé aux administrateurs.</p>
      )}
    </div>
  );
}
