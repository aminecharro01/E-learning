"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Modified: reconnected to Spring Boot API, removed mock data, added role-based rendering

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { lessonFormSchema, type LessonFormValues } from "./schemas";
import { FormField, Toggle, fieldClass } from "./FormField";
import { btn } from "@/lib/ui";

type Props = {
  defaultValues?: Partial<LessonFormValues>;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (values: LessonFormValues) => Promise<void> | void;
  onCancel?: () => void;
};

export function LessonForm({
  defaultValues,
  submitLabel = "Créer la section",
  busy,
  onSubmit,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema) as Resolver<LessonFormValues>,
    mode: "onBlur",
    defaultValues: {
      title: "Nouvelle section",
      orderIndex: 0,
      published: true,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Titre de la section" error={errors.title} required>
        <input autoFocus className={fieldClass(!!errors.title)} {...register("title")} />
      </FormField>
      <FormField
        label="Ordre"
        error={errors.orderIndex}
        hint="Généralement géré par glisser-déposer dans la liste des sections."
      >
        <input type="number" className={fieldClass(!!errors.orderIndex)} {...register("orderIndex")} />
      </FormField>
      <Toggle
        label="Publiée"
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
