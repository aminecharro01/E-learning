"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Dashboard home layout inspired by EcommerceMetrics + ComponentCard + recent table

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminStats, getMyProgress, listQuizzesPaged } from "@/lib/api";
import type { AdminStats, Module, ProgressResponse } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/admin/StatCard";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { Badge } from "@/components/admin/ui/Badge";
import {
  BookIcon,
  CertIcon,
  ChartIcon,
  QuizIcon,
  UsersIcon,
} from "@/components/admin/icons";
import { btn } from "@/lib/ui";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [quizCount, setQuizCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAdminStats(), getMyProgress(), listQuizzesPaged(0, 1)])
      .then(([s, p, quizzes]) => {
        setStats(s);
        setProgress(p);
        setQuizCount(quizzes.totalElements);
      })
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Impossible de charger le dashboard.");
      });
  }, []);

  const modules = progress?.modules ?? [];
  const published = modules.filter((m) => m.published).length;
  const draft = modules.length - published;
  const recent = modules.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-muted">
            Bonjour {user?.fullName?.split(" ")[0] || "formateur"} —{" "}
            {progress?.formationTitle ?? "IAT Academy"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/modules" className={btn.primary}>
            Gérer les cours
          </Link>
          <Link href="/admin/quiz-bank" className={btn.secondary}>
            Studio Quiz
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning" aria-live="polite">
          {error}
        </div>
      )}

      {/* TailAdmin metrics grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <StatCard
          label="Apprenants actifs"
          value={stats?.activeLearners ?? "—"}
          icon={<UsersIcon className="size-6 text-heading" />}
          badge={{ color: "info", text: "Live" }}
        />
        <StatCard
          label="Modules publiés"
          value={`${published}/${modules.length || 20}`}
          hint={`${draft} brouillon(s)`}
          icon={<BookIcon className="size-6 text-heading" />}
        />
        <StatCard
          label="Quiz"
          value={quizCount ?? "—"}
          hint={`${stats?.quizAttemptsTotal ?? 0} tentatives`}
          icon={<QuizIcon className="size-6 text-heading" />}
        />
        <StatCard
          label="Taux de réussite"
          value={stats ? `${stats.averageSuccessRate}%` : "—"}
          icon={<ChartIcon className="size-6 text-heading" />}
          badge={
            stats && stats.averageSuccessRate >= 60
              ? { color: "success", text: "OK" }
              : { color: "warning", text: "Suivi" }
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 md:gap-6">
        {/* Recent modules — TailAdmin recent orders style */}
        <div className="xl:col-span-8">
          <div className="card-theme overflow-hidden rounded-2xl px-4 pb-3 pt-4 sm:px-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-heading">
                Modules du parcours
              </h3>
              <Link href="/admin/modules" className={btn.secondarySm}>
                Voir tout
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-theme">
                    <th className="px-2 py-3 text-left text-xs font-medium text-muted">
                      #
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-muted">
                      Module
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-muted">
                      Statut
                    </th>
                    <th className="px-2 py-3 text-right text-xs font-medium text-muted">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((m) => (
                    <ModuleRow key={m.id} module={m} />
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-2 py-8 text-center text-sm text-muted">
                        Chargement…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side cards */}
        <div className="space-y-4 xl:col-span-4 md:space-y-6">
          <ComponentCard
            title="Attestations"
            desc="Délivrées après validation des 20 modules"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--neutral)]">
                <CertIcon className="size-6 text-[var(--neutral-fg)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-heading">
                  {stats?.certificatesIssued ?? "—"}
                </p>
                <p className="text-sm text-muted">PDF générés</p>
              </div>
            </div>
          </ComponentCard>

          <ComponentCard title="Raccourcis" desc="Accès rapide formateur">
            <ul className="space-y-2">
              <Shortcut href="/admin/modules" label="Studio contenu" />
              <Shortcut href="/admin/quiz-bank" label="Banque de quiz" />
              <Shortcut href="/admin/learners" label="Suivi apprenants" />
              <Shortcut href="/admin/media" label="Médias" />
              <Shortcut href="/app" label="Vue apprenant" />
            </ul>
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}

function ModuleRow({ module }: { module: Module }) {
  return (
    <tr className="border-b border-theme transition-colors hover:bg-surface-2">
      <td className="px-2 py-3 text-sm tabular-nums text-muted">{module.orderIndex + 1}</td>
      <td className="px-2 py-3">
        <p className="text-sm font-medium text-heading">{module.title}</p>
        <p className="line-clamp-1 text-xs text-muted">
          {module.description || "Sans description"}
        </p>
      </td>
      <td className="px-2 py-3">
        <Badge color={module.published ? "success" : "warning"} size="sm">
          {module.published ? "Publié" : "Brouillon"}
        </Badge>
      </td>
      <td className="px-2 py-3 text-right">
        <Link
          href={`/admin/modules/${module.id}`}
          className="text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Studio
        </Link>
      </td>
    </tr>
  );
}

function Shortcut({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-sm text-body transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        <span>{label}</span>
        <span className="text-muted" aria-hidden="true">→</span>
      </Link>
    </li>
  );
}
