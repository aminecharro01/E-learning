"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getMe,
  getMyCertificate,
  getMyProgress,
  type ProgressResponse,
} from "@/lib/api";
import type { Certificate, Module } from "@/types/domain";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { btn } from "@/lib/ui";

const statusLabel: Record<string, string> = {
  LOCKED: "Verrouillé",
  AVAILABLE: "Disponible",
  IN_PROGRESS: "En cours",
  COMPLETED: "Validé",
};

type UfGroup = {
  ufCode: string;
  ufTitle: string;
  modules: Module[];
};

function groupUfs(modules: Module[]): UfGroup[] {
  const ufMap = new Map<string, UfGroup>();
  for (const module of modules) {
    const ufKey = module.ufCode ?? "UF";
    if (!ufMap.has(ufKey)) {
      ufMap.set(ufKey, {
        ufCode: ufKey,
        ufTitle: module.ufTitle ?? ufKey,
        modules: [],
      });
    }
    ufMap.get(ufKey)!.modules.push(module);
  }
  return [...ufMap.values()].map((uf) => ({
    ...uf,
    modules: uf.modules.toSorted((a, b) => a.orderIndex - b.orderIndex),
  }));
}

function defaultExpandedUf(ufs: UfGroup[]): string | null {
  if (ufs.length === 0) return null;
  const active = ufs.find((uf) =>
    uf.modules.some(
      (m) => m.learnerStatus === "IN_PROGRESS" || m.learnerStatus === "AVAILABLE"
    )
  );
  return (active ?? ufs[0]).ufCode;
}

function ModuleCard({ module }: { module: Module }) {
  const locked = module.learnerStatus === "LOCKED";
  const status = module.learnerStatus ?? "AVAILABLE";
  const fill = Math.max(0, Math.min(100, module.progressPercent ?? (status === "COMPLETED" ? 100 : 0)));

  const inner = (
    <>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-500"
        style={{
          width: `${fill}%`,
          background:
            status === "COMPLETED"
              ? "color-mix(in srgb, var(--alert-success-fg) 18%, transparent)"
              : "color-mix(in srgb, var(--primary) 22%, transparent)",
        }}
        aria-hidden
      />
      <div className="relative z-[1] flex h-full min-h-32 flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Module</span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              status === "COMPLETED"
                ? "bg-[var(--alert-success-bg)] text-[var(--alert-success-fg)]"
                : "bg-surface-2/90 text-muted backdrop-blur-sm"
            }`}
          >
            {statusLabel[status]}
          </span>
        </div>
        <div>
          <p className="mt-4 line-clamp-2 font-semibold leading-6 text-heading">{module.title}</p>
          <p className="mt-2 text-xs font-medium tabular-nums text-muted">{fill}% complété</p>
        </div>
      </div>
    </>
  );

  if (locked) {
    return (
      <div className="card-theme relative min-h-32 overflow-hidden rounded-xl bg-surface-2 opacity-70">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/app/learn/${module.id}`}
      className="card-theme relative block min-h-32 overflow-hidden rounded-xl transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] motion-reduce:transform-none"
    >
      {inner}
    </Link>
  );
}

export default function AppHomePage() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [year2Access, setYear2Access] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUfs, setExpandedUfs] = useState<Set<string>>(new Set());
  const [ufInit, setUfInit] = useState(false);

  useEffect(() => {
    Promise.allSettled([getMe(), getMyProgress(), getMyCertificate()]).then(
      ([meResult, progressResult, certificateResult]) => {
        if (meResult.status === "fulfilled") {
          setYear2Access(!!meResult.value.year2AccessEnabled);
        }
        if (progressResult.status === "fulfilled") {
          setProgress(progressResult.value);
          setCertificate(certificateResult.status === "fulfilled" ? certificateResult.value : null);
        } else {
          setError("Connexion requise ou serveur indisponible.");
        }
      }
    );
  }, []);

  const currentYear = year2Access ? 2 : 1;

  const yearModules = useMemo(() => {
    if (!progress) return [];
    return progress.modules.filter((m) => (m.yearNumber ?? 1) === currentYear);
  }, [progress, currentYear]);

  const ufs = useMemo(() => groupUfs(yearModules), [yearModules]);

  useEffect(() => {
    if (ufInit || ufs.length === 0) return;
    const key = defaultExpandedUf(ufs);
    setExpandedUfs(key ? new Set([key]) : new Set());
    setUfInit(true);
  }, [ufs, ufInit]);

  const stageUnlocked = useMemo(
    () =>
      progress?.modules.some(
        (m) => m.ufCode === "UF 5" && m.learnerStatus && m.learnerStatus !== "LOCKED"
      ) ?? false,
    [progress]
  );

  const yearLabel = currentYear === 2 ? "2ème Année" : "1ère Année";
  const yearCompletion = useMemo(() => {
    if (yearModules.length === 0) return 0;
    const done = yearModules.filter((m) => m.learnerStatus === "COMPLETED").length;
    return Math.round((done * 1000) / yearModules.length) / 10;
  }, [yearModules]);

  function toggleUf(ufCode: string) {
    setExpandedUfs((prev) => {
      const next = new Set(prev);
      if (next.has(ufCode)) next.delete(ufCode);
      else next.add(ufCode);
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <LearnerAppHeader showParcoursLink={false} stageUnlocked={stageUnlocked} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {error && (
          <p className="alert alert-warning mb-6" aria-live="polite">
            {error}{" "}
            <Link href="/login" className="underline">
              Se connecter
            </Link>
          </p>
        )}

        {!progress && !error && (
          <div className="space-y-6" aria-label="Chargement de votre parcours" aria-busy="true">
            <div className="card-theme h-56 animate-pulse rounded-2xl bg-surface-2" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="card-theme h-28 animate-pulse rounded-xl bg-surface-2" />
              ))}
            </div>
          </div>
        )}

        {progress && (
          <>
            <section className="card-theme overflow-hidden rounded-2xl">
              <div className="bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_12%,var(--surface)),var(--surface))] p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold text-primary">{yearLabel}</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-heading sm:text-3xl">
                      {progress.formationTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {ufs.length} unités de formation · {yearModules.length} modules cette année.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary px-4 py-3 text-center text-[var(--primary-fg)] shadow-sm">
                    <strong className="block text-2xl font-bold tabular-nums">{yearCompletion}%</strong>
                    <span className="text-xs font-medium opacity-90">année en cours</span>
                  </div>
                </div>
                <div
                  className="progress-track mt-6 h-2.5"
                  role="progressbar"
                  aria-label="Progression de l'année"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={yearCompletion}
                >
                  <div className="progress-fill h-full" style={{ width: `${yearCompletion}%` }} />
                </div>
              </div>

              {progress.currentModuleId && progress.resumeLessonId && (
                <div className="m-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[var(--alert-info-bg)] p-4 text-[var(--alert-info-fg)] sm:m-6">
                  <div>
                    <p className="text-sm font-semibold">
                      Reprendre : {progress.resumeModuleTitle || "module en cours"}
                    </p>
                    <p className="mt-1 text-xs opacity-90">Continuez là où vous vous êtes arrêté.</p>
                  </div>
                  <Link
                    href={`/app/learn/${progress.currentModuleId}/s/${progress.resumeLessonId}`}
                    className={btn.primarySm}
                  >
                    Continuer →
                  </Link>
                </div>
              )}

              {certificate ? (
                <div className="m-4 rounded-xl bg-[var(--alert-success-bg)] p-4 text-[var(--alert-success-fg)] sm:m-6">
                  <p className="text-sm font-semibold">Parcours terminé — diplôme en cours de remise</p>
                  <p className="mt-1 text-xs opacity-90">
                    Code de vérification : {certificate.verificationCode}.
                    {certificate.physicallyDelivered ? " Statut : déjà remis." : ""}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="mt-10">
              <div className="mb-5">
                <p className="text-sm font-semibold text-primary">{yearLabel}</p>
                <h3 className="mt-1 text-xl font-bold tracking-tight text-heading">
                  Unités de formation
                </h3>
              </div>

              {ufs.map((uf) => {
                const open = expandedUfs.has(uf.ufCode);
                return (
                  <div key={uf.ufCode} className="mb-4 overflow-hidden rounded-2xl border border-theme bg-surface">
                    <button
                      type="button"
                      onClick={() => toggleUf(uf.ufCode)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                      aria-expanded={open}
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-heading">{uf.ufTitle}</h4>
                        <p className="mt-0.5 text-xs text-muted">
                          {uf.modules.length} module{uf.modules.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="text-muted" aria-hidden>
                        {open ? "▾" : "▸"}
                      </span>
                    </button>
                    {open ? (
                      <ul className="grid gap-4 border-t border-theme p-4 sm:grid-cols-2 lg:grid-cols-3">
                        {uf.modules.map((module) => (
                          <li key={module.id}>
                            <ModuleCard module={module} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
