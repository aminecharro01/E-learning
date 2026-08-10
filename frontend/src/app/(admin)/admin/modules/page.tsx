"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getMyProgress, updateModule } from "@/lib/api";
import { Modal } from "@/components/admin/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ModuleForm } from "@/components/admin/forms/ModuleForm";
import type { ModuleFormValues } from "@/components/admin/forms/schemas";
import {
  IconButton,
  IconEdit,
  IconPublish,
} from "@/components/admin/ActionIcons";
import type { Module } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { filterByYear, groupUfs, yearLabel } from "@/lib/programme";
import {
  IconCheck,
  IconCompass,
  IconPlane,
  IconTower,
} from "@/components/brand/IatIcons";
import { btn, inputClass } from "@/lib/ui";

function AdminModuleCard({
  module,
  index,
  onEdit,
  onTogglePublish,
}: {
  module: Module;
  index: number;
  onEdit: () => void;
  onTogglePublish: (e: React.MouseEvent) => void;
}) {
  const stub = `M-${String(index + 1).padStart(2, "0")}`;

  return (
    <article className="course-card">
      <div className="course-body">
        <Link
          href={`/admin/modules/${module.id}`}
          className="block min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="course-tag">
              <IconTower size={14} />
              Module
            </span>
            <span
              className={`badge-inline ${module.published ? "badge-success" : "badge-gold"}`}
            >
              {module.published ? "Publié" : "Brouillon"}
            </span>
          </div>
          <div className="course-title">{module.title}</div>
          <div className="course-meta line-clamp-2">
            {module.description || "Aucune description"}
          </div>
        </Link>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <IconButton label="Modifier le module" onClick={onEdit}>
            <IconEdit />
          </IconButton>
          <IconButton
            label={module.published ? "Désactiver" : "Publier"}
            tone={module.published ? "success" : "warn"}
            onClick={onTogglePublish}
          >
            <IconPublish on={module.published} />
          </IconButton>
          <Link href={`/app/learn/${module.id}`} className={btn.neutralXs}>
            Aperçu
          </Link>
          <Link href={`/admin/modules/${module.id}`} className={btn.primaryXs}>
            Éditer →
          </Link>
        </div>
      </div>
      <div className="course-stub">
        {module.published ? <IconCheck size={22} /> : <IconPlane size={22} />}
        <span className="course-stub-code">{stub}</span>
      </div>
    </article>
  );
}

export default function AdminModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [year, setYear] = useState<1 | 2>(1);
  const [expandedUfs, setExpandedUfs] = useState<Set<string>>(new Set());
  const [ufInit, setUfInit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Module | null>(null);

  useEffect(() => {
    getMyProgress()
      .then((p) => setModules(p.modules))
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Impossible de charger les modules.");
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
        m.title.toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q) ||
        (m.ufTitle || "").toLowerCase().includes(q) ||
        (m.ufCode || "").toLowerCase().includes(q)
      );
    });
  }, [modules, search, filter]);

  const yearModules = useMemo(() => filterByYear(filtered, year), [filtered, year]);
  const ufs = useMemo(() => groupUfs(yearModules), [yearModules]);

  useEffect(() => {
    setUfInit(false);
  }, [year, filter, search]);

  useEffect(() => {
    if (ufInit || ufs.length === 0) return;
    setExpandedUfs(new Set([ufs[0].ufCode]));
    setUfInit(true);
  }, [ufs, ufInit]);

  const publishedCount = modules.filter((m) => m.published).length;
  const yearPublished = yearModules.filter((m) => m.published).length;

  function toggleUf(ufCode: string) {
    setExpandedUfs((prev) => {
      const next = new Set(prev);
      if (next.has(ufCode)) next.delete(ufCode);
      else next.add(ufCode);
      return next;
    });
  }

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
        yearNumber: values.yearNumber,
        ufCode: values.ufCode,
        ufTitle: values.ufTitle,
      });
      setModules((prev) =>
        prev.map((m) =>
          m.id === editing.id
            ? {
                ...m,
                title: updated.title,
                description: updated.description,
                orderIndex: updated.orderIndex,
                published: updated.published,
                yearNumber: updated.yearNumber,
                ufCode: updated.ufCode,
                ufTitle: updated.ufTitle,
                code: updated.code ?? m.code,
              }
            : m
        )
      );
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
        yearNumber: module.yearNumber ?? undefined,
        ufCode: module.ufCode ?? undefined,
        ufTitle: module.ufTitle ?? undefined,
      });
      setModules((prev) =>
        prev.map((m) =>
          m.id === module.id
            ? {
                ...m,
                title: updated.title,
                description: updated.description,
                orderIndex: updated.orderIndex,
                published: updated.published,
                yearNumber: updated.yearNumber,
                ufCode: updated.ufCode,
                ufTitle: updated.ufTitle,
                code: updated.code ?? m.code,
              }
            : m
        )
      );
      setMsg(updated.published ? "Module publié." : "Module désactivé (brouillon).");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Changement de statut impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="iat-board space-y-6">
      <section className="boarding-pass !mt-0" aria-label="Catalogue du programme">
        <div className="bp-main">
          <span className="bp-eyebrow">
            <IconCompass size={14} />
            Programme 2 ans · 11 UF · 36 modules
          </span>
          <h1 className="bp-title">
            Cours &amp; <span className="grad">modules</span>
          </h1>
          <p className="bp-desc">
            Structure client : Année → Unité de formation → Modules. Ouvrez le studio pour éditer
            sections et médias.
          </p>
          <dl className="bp-meta">
            <div>
              <dt>Publiés</dt>
              <dd>
                {publishedCount}/{modules.length || 36}
              </dd>
            </div>
            <div>
              <dt>{yearLabel(year)}</dt>
              <dd>
                {yearPublished}/{yearModules.length}
              </dd>
            </div>
          </dl>
        </div>
        <div className="bp-stub">
          <div className="bp-flight-code">IAT · ADM</div>
          <div className="bp-gate">
            <span>PORTE</span>
            A{year}
          </div>
          <div className="bp-barcode" aria-hidden />
        </div>
        <div className="bp-notch" aria-hidden />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-theme p-0.5">
          {([1, 2] as const).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`tab-pill rounded-md px-3 py-1.5 text-xs font-medium ${
                year === y ? "tab-pill-active" : ""
              }`}
            >
              {yearLabel(y)}
            </button>
          ))}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : (
        <section>
          <div className="section-head">
            <span className="section-num">0{year}</span>
            <h2 className="section-title">Unités de formation</h2>
          </div>
          <p className="section-desc">
            {yearLabel(year)} — titres uniquement (pas de codes module à l&apos;écran).
          </p>

          {ufs.map((uf) => {
            const open = expandedUfs.has(uf.ufCode);
            const publishedInUf = uf.modules.filter((m) => m.published).length;
            return (
              <div key={uf.ufCode} className="uf-panel">
                <button
                  type="button"
                  onClick={() => toggleUf(uf.ufCode)}
                  className="uf-toggle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  aria-expanded={open}
                >
                  <div>
                    <div className="uf-toggle-title">{uf.ufTitle}</div>
                    <div className="uf-toggle-meta">
                      {uf.ufCode} · {uf.modules.length} module
                      {uf.modules.length > 1 ? "s" : ""} · {publishedInUf} publié
                      {publishedInUf > 1 ? "s" : ""}
                    </div>
                  </div>
                  <span className="text-muted" aria-hidden>
                    {open ? "▾" : "▸"}
                  </span>
                </button>
                {open ? (
                  <ul className="grid gap-4 border-t border-theme p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {uf.modules.map((module, moduleIndex) => (
                      <li key={module.id}>
                        <AdminModuleCard
                          module={module}
                          index={moduleIndex}
                          onEdit={() => setEditing(module)}
                          onTogglePublish={(e) => void togglePublished(module, e)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}

          {ufs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">Aucun module trouvé.</p>
          )}
        </section>
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
              yearNumber: editing.yearNumber ?? 1,
              ufCode: editing.ufCode ?? "UF 1",
              ufTitle: editing.ufTitle ?? "Langues et communication",
            }}
            onSubmit={onSaveModule}
          />
        )}
      </Modal>
    </div>
  );
}
