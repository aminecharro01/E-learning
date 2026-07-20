"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMyProgress, updateModule } from "@/lib/api";
import { Modal } from "@/components/admin/Modal";
import { ModuleForm } from "@/components/admin/forms/ModuleForm";
import type { ModuleFormValues } from "@/components/admin/forms/schemas";
import {
  IconButton,
  IconEdit,
  IconPublish,
} from "@/components/admin/ActionIcons";
import type { Module } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { btn, inputClass } from "@/lib/ui";

export default function AdminModulesPage() {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Module | null>(null);

  useEffect(() => {
    getMyProgress()
      .then((p) => setModules(p.modules))
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Chargement impossible.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modules.filter((m) => {
      if (filter === "PUBLISHED" && !m.published) return false;
      if (filter === "DRAFT" && m.published) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) || (m.description || "").toLowerCase().includes(q)
      );
    });
  }, [modules, search, filter]);

  const publishedCount = modules.filter((m) => m.published).length;

  async function onSaveModule(values: ModuleFormValues) {
    if (!editing) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const updated = await updateModule(editing.id, {
        title: values.title,
        description: values.description || undefined,
        orderIndex: values.orderIndex,
        published: values.published,
      });
      setModules((prev) => prev.map((m) => (m.id === editing.id ? { ...m, ...updated } : m)));
      setEditing(null);
      setMsg("Module mis à jour.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Mise à jour impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(module: Module, e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const updated = await updateModule(module.id, {
        title: module.title,
        description: module.description || undefined,
        orderIndex: module.orderIndex,
        published: !module.published,
      });
      setModules((prev) => prev.map((m) => (m.id === module.id ? { ...m, ...updated } : m)));
      setMsg(updated.published ? "Module publié." : "Module désactivé (brouillon).");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Changement de statut impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Contenu</p>
          <h1 className="mt-1 text-2xl font-semibold text-heading">Cours & modules</h1>
          <p className="mt-1 text-sm text-muted">
            {publishedCount}/{modules.length || 20} publiés — ouvrez le studio pour éditer sections
            et médias
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-theme p-0.5">
            {(
              [
                ["ALL", "Tous"],
                ["PUBLISHED", "Publiés"],
                ["DRAFT", "Brouillons"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`tab-pill rounded-md px-3 py-1.5 text-xs font-medium ${
                  filter === id ? "tab-pill-active" : ""
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className={`${inputClass} w-48 sm:w-56`}
          />
        </div>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {msg && <p className="alert alert-success">{msg}</p>}

      {loading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : (
        <ol className="space-y-2">
          {filtered.map((module) => (
            <li key={module.id}>
              <article className="card-theme group flex flex-wrap items-center gap-4 rounded-xl px-4 py-3 transition hover:border-primary">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/modules/${module.id}`)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-bold tabular-nums text-heading">
                    {module.orderIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold text-heading group-hover:text-primary">
                        {module.title}
                      </h2>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          module.published
                            ? "bg-[var(--alert-success-bg)] text-[var(--alert-success-fg)]"
                            : "bg-[var(--alert-warning-bg)] text-[var(--alert-warning-fg)]"
                        }`}
                      >
                        {module.published ? "Publié" : "Brouillon"}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                      {module.description || "Aucune description"}
                    </p>
                  </div>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <IconButton
                    label="Modifier le module"
                    onClick={() => setEditing(module)}
                  >
                    <IconEdit />
                  </IconButton>
                  <IconButton
                    label={module.published ? "Désactiver" : "Publier"}
                    tone={module.published ? "success" : "warn"}
                    onClick={(e) => void togglePublished(module, e)}
                  >
                    <IconPublish on={module.published} />
                  </IconButton>
                  <Link
                    href={`/app/learn/${module.id}`}
                    className={btn.neutralXs}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Aperçu
                  </Link>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/modules/${module.id}`)}
                    className={btn.primaryXs}
                  >
                    Studio →
                  </button>
                </div>
              </article>
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">Aucun module trouvé.</p>
          )}
        </ol>
      )}

      <Modal
        open={!!editing}
        title="Modifier le module"
        onClose={() => (!busy ? setEditing(null) : undefined)}
      >
        {editing && (
          <ModuleForm
            key={editing.id}
            busy={busy}
            submitLabel="Enregistrer"
            onCancel={() => setEditing(null)}
            defaultValues={{
              title: editing.title,
              description: editing.description || "",
              orderIndex: editing.orderIndex,
              published: editing.published,
            }}
            onSubmit={onSaveModule}
          />
        )}
      </Modal>
    </div>
  );
}
