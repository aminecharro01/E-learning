"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard

import { useEffect, useState } from "react";
import { getAdminStats } from "@/lib/api";
import { StatCard } from "@/components/admin/StatCard";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import {
  BookIcon,
  CertIcon,
  ChartIcon,
  QuizIcon,
  UsersIcon,
} from "@/components/admin/icons";
import type { AdminStats } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";

/**
 * Charts intentionally use lightweight Tailwind bars (no ApexCharts / Chart.js added).
 * Confirm before introducing a chart library.
 */
export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Erreur stats."));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Statistiques</h1>
        <p className="mt-1 text-sm text-muted">Indicateurs en temps réel de la plateforme</p>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-6">
        <StatCard
          label="Apprenants actifs"
          value={stats?.activeLearners ?? "—"}
          icon={<UsersIcon className="size-6 text-heading" />}
        />
        <StatCard
          label="Taux de réussite moyen"
          value={stats ? `${stats.averageSuccessRate}%` : "—"}
          icon={<ChartIcon className="size-6 text-heading" />}
        />
        <StatCard
          label="Attestations"
          value={stats?.certificatesIssued ?? "—"}
          icon={<CertIcon className="size-6 text-heading" />}
        />
        <StatCard
          label="Modules"
          value={stats?.modulesCount ?? "—"}
          icon={<BookIcon className="size-6 text-heading" />}
        />
        <StatCard label="Sections publiées" value={stats?.publishedLessons ?? "—"} />
        <StatCard
          label="Tentatives quiz"
          value={stats?.quizAttemptsTotal ?? "—"}
          icon={<QuizIcon className="size-6 text-heading" />}
        />
      </div>

      <ComponentCard title="Réussite moyenne" desc="Indicateur global des tentatives soumises">
        <div className="progress-track h-3">
          <div
            className="progress-fill h-full"
            style={{ width: `${Math.min(100, stats?.averageSuccessRate ?? 0)}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          {stats ? `${stats.averageSuccessRate}%` : "—"} de réussite moyenne
        </p>
      </ComponentCard>
    </div>
  );
}
