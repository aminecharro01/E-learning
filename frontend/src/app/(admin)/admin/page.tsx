"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Dashboard home layout inspired by EcommerceMetrics + ComponentCard + recent table

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getAdminStats, getMyProgress, getPendingReviewAttempts } from "@/lib/api";
import type { AdminStats, Module, ProgressResponse } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/admin/StatCard";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { Badge } from "@/components/admin/ui/Badge";
import { CertIcon, ChartIcon, MailIcon, UsersIcon } from "@/components/admin/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { btn } from "@/lib/ui";
import { FormateurDashboard } from "@/components/admin/dashboard/FormateurDashboard";
import { SupportDashboard } from "@/components/admin/dashboard/SupportDashboard";

export default function AdminDashboardPage() {
  const { isAdmin, isSupport } = useAuth();
  if (isSupport) return <SupportDashboard />;
  if (!isAdmin) return <FormateurDashboard />;
  return <DirecteurDashboard />;
}

/** Vue Directeur / Super Admin — indicateurs plateforme (apprenants, contact, réussite,
 *  certificats) et gestion des cours. Formateur et Support ont leur propre tableau de bord
 *  ci-dessus : leurs missions et leurs permissions ne recoupent pas celles du Directeur. */
function DirecteurDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [pendingGradingCount, setPendingGradingCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAdminStats(), getMyProgress(), getPendingReviewAttempts()])
      .then(([s, p, pending]) => {
        setStats(s);
        setProgress(p);
        setPendingGradingCount(pending.length);
      })
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Impossible de charger le tableau de bord.");
      });
  }, []);

  const modules = progress?.modules ?? [];
  const recent = modules.slice(0, 8);
  const draftModulesCount = modules.filter((m) => !m.published).length;

  const attentionLoaded = stats !== null && progress !== null && pendingGradingCount !== null;
  const attentionItems = [
    pendingGradingCount && pendingGradingCount > 0
      ? { href: "/admin/grading", label: "Réponse(s) à corriger", count: pendingGradingCount }
      : null,
    stats && stats.newContactMessages > 0
      ? { href: "/admin/leads", label: "Message(s) de contact non traité(s)", count: stats.newContactMessages }
      : null,
    draftModulesCount > 0
      ? { href: "/admin/modules", label: "Module(s) en brouillon", count: draftModulesCount }
      : null,
  ].filter((item): item is { href: string; label: string; count: number } => item !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-muted">
            {user?.fullName?.split(" ")[0] ? `Bonjour ${user.fullName.split(" ")[0]}` : "Bonjour"} —{" "}
            {progress?.formationTitle ?? "IAT Academy"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/modules" className={btn.primary}>
            Gérer les cours
          </Link>
          <Link href="/admin/quiz-bank" className={btn.secondary}>
            Banque de quiz
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning" aria-live="polite">
          {error}
        </div>
      )}

      {/* Task-oriented "what needs your attention" panel — surfaced above the passive
          stats grid so the admin sees what to DO before what to read. */}
      <ComponentCard title="À faire" desc="Ce qui a besoin de vous, en un coup d'œil">
        {!attentionLoaded ? (
          <Skeleton className="h-14 rounded-xl" />
        ) : attentionItems.length === 0 ? (
          <p className="text-sm text-muted">Tout est à jour — rien ne nécessite votre attention pour le moment.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {attentionItems.map((item) => (
              <AttentionItem key={item.href} {...item} />
            ))}
          </div>
        )}
      </ComponentCard>

      {/* TailAdmin metrics grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <StatCard
          label="Apprenants actifs"
          value={stats?.activeLearners ?? "—"}
          icon={<UsersIcon className="size-6 text-heading" />}
          badge={{ color: "info", text: "En direct" }}
        />
        <StatCard
          label="Messages contact"
          value={stats?.newContactMessages ?? "—"}
          hint="Non lus"
          icon={<MailIcon className="size-6 text-heading" />}
          badge={
            stats && stats.newContactMessages > 0
              ? { color: "warning", text: "À traiter" }
              : { color: "success", text: "À jour" }
          }
        />
        <StatCard
          label="Infolettre"
          value={stats?.newsletterSubscribers ?? "—"}
          hint="Abonnés actifs"
          icon={<MailIcon className="size-6 text-heading" />}
        />
        <StatCard
          label="Taux de réussite"
          value={stats ? `${stats.averageSuccessRate}%` : "—"}
          icon={<ChartIcon className="size-6 text-heading" />}
          badge={
            stats && stats.averageSuccessRate >= 60
              ? { color: "success", text: "À jour" }
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
            desc="Délivrées après validation des 36 modules (cycle 2 ans)"
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
              <Shortcut href="/admin/modules" label="Éditeur de contenu" />
              <Shortcut href="/admin/quiz-bank" label="Banque de quiz" />
              <Shortcut href="/admin/learners" label="Suivi apprenants" />
              <Shortcut href="/admin/leads" label="Contact & infolettre" />
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
          Éditer
        </Link>
      </td>
    </tr>
  );
}

function AttentionItem({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-theme bg-surface-2 px-4 py-3 transition-colors hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
      <span className="text-sm font-medium text-heading">{label}</span>
      <Badge color="warning" size="sm">
        {count}
      </Badge>
    </Link>
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
        <span className="text-muted" aria-hidden="true">
          <ChevronRight size={16} />
        </span>
      </Link>
    </li>
  );
}
