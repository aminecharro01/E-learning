"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyProgress, getPendingReviewAttempts } from "@/lib/api";
import type { ProgressResponse } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";
import { StatCard } from "@/components/admin/StatCard";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { Badge } from "@/components/admin/ui/Badge";
import { ChevronRight } from "lucide-react";
import { CalendarIcon, ChatIcon, ClipboardIcon, MessagingIcon } from "@/components/admin/icons";
import { Skeleton } from "@/components/ui/Skeleton";

/** Tableau de bord recentré sur la journée du formateur — ce qui reste à corriger et ce qui
 *  se passe côté apprenants — plutôt que les indicateurs plateforme du Directeur. */
export function FormateurDashboard() {
  const { user } = useAuth();
  const unreadMessages = useUnreadMessagesCount();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [pendingQuizCount, setPendingQuizCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMyProgress(), getPendingReviewAttempts()])
      .then(([p, pending]) => {
        setProgress(p);
        setPendingQuizCount(pending.length);
      })
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Impossible de charger le tableau de bord.");
      });
  }, []);

  const modules = progress?.modules ?? [];
  const publishedCount = modules.filter((m) => m.published).length;
  const loaded = pendingQuizCount !== null;

  const attentionItems = [
    pendingQuizCount && pendingQuizCount > 0
      ? { href: "/admin/grading", label: "Réponse(s) de quiz à corriger", count: pendingQuizCount }
      : null,
    unreadMessages > 0
      ? { href: "/admin/messages", label: "Message(s) non lu(s)", count: unreadMessages }
      : null,
  ].filter((item): item is { href: string; label: string; count: number } => item !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted">
          {user?.fullName?.split(" ")[0] ? `Bonjour ${user.fullName.split(" ")[0]}` : "Bonjour"} — Espace formateur
        </p>
      </div>

      {error && (
        <div className="alert alert-warning" aria-live="polite">
          {error}
        </div>
      )}

      <ComponentCard title="À faire" desc="Ce qui a besoin de vous, en un coup d'œil">
        {!loaded ? (
          <Skeleton className="h-14 rounded-xl" />
        ) : attentionItems.length === 0 ? (
          <p className="text-sm text-muted">Tout est à jour — rien ne nécessite votre attention pour le moment.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {attentionItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-xl border border-theme bg-surface-2 px-4 py-3 transition-colors hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <span className="text-sm font-medium text-heading">{item.label}</span>
                <Badge color="warning" size="sm">
                  {item.count}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </ComponentCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        <StatCard
          label="Réponses à corriger"
          value={pendingQuizCount ?? "—"}
          icon={<ClipboardIcon className="size-6 text-heading" />}
          badge={pendingQuizCount && pendingQuizCount > 0 ? { color: "warning", text: "À traiter" } : { color: "success", text: "À jour" }}
        />
        <StatCard
          label="Messages non lus"
          value={unreadMessages}
          icon={<MessagingIcon className="size-6 text-heading" />}
          badge={unreadMessages > 0 ? { color: "warning", text: "À traiter" } : { color: "success", text: "À jour" }}
        />
        <StatCard
          label="Modules publiés"
          value={progress ? publishedCount : "—"}
          hint={progress ? `sur ${modules.length} au total` : undefined}
          icon={<ChatIcon className="size-6 text-heading" />}
        />
      </div>

      <ComponentCard title="Raccourcis" desc="Accès rapide">
        <ul className="grid gap-2 sm:grid-cols-2">
          <Shortcut href="/admin/grading" label="Correction manuelle" />
          <Shortcut href="/admin/gradebook" label="Devoirs & notes" />
          <Shortcut href="/admin/sessions" label="Sessions live" icon={<CalendarIcon className="size-4" />} />
          <Shortcut href="/admin/messages" label="Messagerie" />
          <Shortcut href="/admin/learners" label="Suivi apprenants" />
          <Shortcut href="/admin/media" label="Médias" />
        </ul>
      </ComponentCard>
    </div>
  );
}

function Shortcut({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-sm text-body transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        <span className="text-muted" aria-hidden="true">
          <ChevronRight size={16} />
        </span>
      </Link>
    </li>
  );
}
