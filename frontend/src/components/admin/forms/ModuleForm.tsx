"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Modified: reconnected to Spring Boot API, removed mock data, added role-based rendering

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { moduleFormSchema, type ModuleFormValues } from "./schemas";
import { FormField, inputClass } from "./FormField";
import { btn } from "@/lib/ui";

type Props = {
  defaultValues?: Partial<ModuleFormValues>;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (values: ModuleFormValues) => Promise<void> | void;
  onCancel?: () => void;
};

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
    formState: { errors },
  } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema) as Resolver<ModuleFormValues>,
    defaultValues: {
      title: "",
      description: "",
      orderIndex: 0,
      published: true,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Titre" error={errors.title}>
        <input className={inputClass} {...register("title")} />
      </FormField>
      <FormField label="Description" error={errors.description}>
        <textarea className={inputClass} rows={3} {...register("description")} />
      </FormField>
      <FormField label="Ordre (orderIndex)" error={errors.orderIndex}>
        <input type="number" className={inputClass} {...register("orderIndex")} />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-body">
        <input type="checkbox" {...register("published")} />
        Publié
      </label>
      <div className="flex justify-end gap-2 pt-2">
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
