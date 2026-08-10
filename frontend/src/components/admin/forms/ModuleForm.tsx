"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { moduleFormSchema, type ModuleFormValues } from "./schemas";
import { FormField, FormSection, Toggle, fieldClass } from "./FormField";
import { btn } from "@/lib/ui";

type Props = {
  defaultValues?: Partial<ModuleFormValues>;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (values: ModuleFormValues) => Promise<void> | void;
  onCancel?: () => void;
};

const UF_PRESETS: { code: string; title: string; year: number }[] = [
  { code: "UF 1", title: "Langues et communication", year: 1 },
  { code: "UF 2", title: "Exploitation touristique et aéroportuaire", year: 1 },
  { code: "UF 3", title: "Environnement aéronautique", year: 1 },
  { code: "UF 4", title: "Connaissances générales complémentaires", year: 1 },
  { code: "UF 5", title: "Stage en milieu réel", year: 1 },
  { code: "UF 6", title: "Techniques d'expression", year: 2 },
  { code: "UF 7", title: "Gestion et exploitation touristiques", year: 2 },
  { code: "UF 8", title: "Exploitation aéronautique", year: 2 },
  { code: "UF 9", title: "Connaissances et outils de gestion", year: 2 },
  { code: "UF 10", title: "Culture d'entreprise", year: 2 },
  { code: "UF 11", title: "Travaux de synthèse", year: 2 },
];

export function ModuleForm({
  defaultValues,
  submitLabel = "Enregistrer le module",
  busy,
  onSubmit,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema) as Resolver<ModuleFormValues>,
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      orderIndex: 0,
      published: true,
      yearNumber: 1,
      ufCode: "UF 1",
      ufTitle: "Langues et communication",
      ...defaultValues,
    },
  });

  const yearNumber = Number(watch("yearNumber"));
  const ufCode = watch("ufCode");
  const ufPresets = UF_PRESETS.filter((u) => u.year === yearNumber);

  useEffect(() => {
    const stillValid = UF_PRESETS.some((u) => u.code === ufCode && u.year === yearNumber);
    if (!stillValid) {
      const first = UF_PRESETS.find((u) => u.year === yearNumber);
      if (first) {
        setValue("ufCode", first.code);
        setValue("ufTitle", first.title);
      }
    }
  }, [yearNumber, ufCode, setValue]);

  function applyUfPreset(code: string) {
    const preset = UF_PRESETS.find((u) => u.code === code);
    if (!preset) return;
    setValue("ufCode", preset.code);
    setValue("ufTitle", preset.title);
    setValue("yearNumber", preset.year);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormSection title="Informations générales">
        <FormField label="Titre du module" error={errors.title} required>
          <input autoFocus className={fieldClass(!!errors.title)} {...register("title")} />
        </FormField>
        <FormField label="Description" error={errors.description}>
          <textarea className={fieldClass(!!errors.description)} rows={3} {...register("description")} />
        </FormField>
      </FormSection>

      <FormSection
        title="Positionnement dans le parcours"
        description="Où ce module apparaît dans le programme de l'apprenant"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Année" error={errors.yearNumber}>
            <select className={fieldClass(!!errors.yearNumber)} {...register("yearNumber")}>
              <option value={1}>1ère Année</option>
              <option value={2}>2ème Année</option>
            </select>
          </FormField>
          <FormField label="Unité de formation" error={errors.ufCode}>
            <select
              className={fieldClass(!!errors.ufCode)}
              value={ufCode}
              onChange={(e) => applyUfPreset(e.target.value)}
            >
              {ufPresets.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.code} — {u.title}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Titre UF (affichage)" error={errors.ufTitle}>
          <input className={fieldClass(!!errors.ufTitle)} {...register("ufTitle")} />
        </FormField>
        <input type="hidden" {...register("ufCode")} />

        <FormField
          label="Ordre dans le parcours"
          error={errors.orderIndex}
          hint="Généralement géré par glisser-déposer dans la liste des modules — à ajuster ici seulement si besoin."
        >
          <input type="number" className={fieldClass(!!errors.orderIndex)} {...register("orderIndex")} />
        </FormField>
      </FormSection>

      <Toggle
        label="Publié"
        description="Visible par les apprenants dès l'enregistrement"
        registration={register("published")}
      />

      <div className="flex justify-end gap-2 border-t border-theme pt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className={btn.neutral}>
            Annuler
          </button>
        )}
        <button type="submit" disabled={busy} className={btn.primary}>
          {busy ? "…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
