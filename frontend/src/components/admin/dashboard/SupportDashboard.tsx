"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getAdminStats } from "@/lib/api";
import type { AdminStats } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";
import { StatCard } from "@/components/admin/StatCard";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { MailIcon, MessagingIcon, UsersIcon } from "@/components/admin/icons";

/** Tableau de bord Support : aucune donnée pédagogique (cours, quiz, certificats) — juste
 *  ce qui relève réellement du rôle : contact, infolettre, messagerie, recherche d'un compte. */
export function SupportDashboard() {
  const { user } = useAuth();
  const unreadMessages = useUnreadMessagesCount();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Impossible de charger le tableau de bord.");
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted">
          {user?.fullName?.split(" ")[0] ? `Bonjour ${user.fullName.split(" ")[0]}` : "Bonjour"} — Espace Support
        </p>
      </div>

      {error && (
        <div className="alert alert-warning" aria-live="polite">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        <StatCard
          label="Messages contact"
          value={stats?.newContactMessages ?? "—"}
          hint="Non traités"
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
          label="Messages non lus"
          value={unreadMessages}
          icon={<MessagingIcon className="size-6 text-heading" />}
          badge={unreadMessages > 0 ? { color: "warning", text: "À traiter" } : { color: "success", text: "À jour" }}
        />
      </div>

      <ComponentCard title="Raccourcis" desc="Accès rapide">
        <ul className="grid gap-2 sm:grid-cols-2">
          <Shortcut href="/admin/leads" label="Contact & infolettre" icon={<MailIcon className="size-4" />} />
          <Shortcut href="/admin/messages" label="Messagerie" icon={<MessagingIcon className="size-4" />} />
          <Shortcut href="/admin/learners" label="Rechercher un apprenant" icon={<UsersIcon className="size-4" />} />
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
