"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CircleUserRound, Briefcase, LogOut } from "lucide-react";
import { getMe, getMyProgress, logout } from "@/lib/api";
import type { User } from "@/types/domain";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { LearnerSearch } from "@/components/learner/LearnerSearch";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { btn } from "@/lib/ui";

function greetingForNow(fullName: string | null | undefined): string {
  const hour = new Date().getHours();
  const salutation = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
  const name = fullName?.trim() || "apprenant";
  return `${salutation}, ${name}`;
}

type LearnerAppHeaderProps = {
  /** Conteneur intérieur (largeur max selon la page). */
  containerClassName?: string;
  /** Masquer le lien Parcours quand on est déjà sur /app. */
  showParcoursLink?: boolean;
  /** Si fourni, évite un fetch progress pour le lien Stage. */
  stageUnlocked?: boolean;
};

export function LearnerAppHeader({
  containerClassName = "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6",
  showParcoursLink = true,
  stageUnlocked: stageUnlockedProp,
}: LearnerAppHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stageUnlocked, setStageUnlocked] = useState(stageUnlockedProp ?? false);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (stageUnlockedProp !== undefined) {
      setStageUnlocked(stageUnlockedProp);
      return;
    }
    getMyProgress()
      .then((progress) => {
        setStageUnlocked(
          progress.modules.some(
            (m) => m.ufCode === "UF 5" && m.learnerStatus && m.learnerStatus !== "LOCKED"
          )
        );
      })
      .catch(() => setStageUnlocked(false));
  }, [stageUnlockedProp]);

  async function onLogout() {
    await logout().catch(() => undefined);
    router.push("/login");
  }

  return (
    <header className="app-header sticky top-0 z-20 shrink-0">
      <div className={containerClassName}>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-3">
            <BrandLogo href="/app" size="md" />
            <p className="eyebrow !mb-0">Espace apprenant</p>
          </div>
          <h1 className="truncate text-xl font-bold tracking-tight text-heading">
            {user ? greetingForNow(user.fullName) : "Espace apprenant"}
          </h1>
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2" aria-label="Navigation apprenant">
          <LearnerSearch />
          <NotificationBell />
          <ThemeToggleButton />
          {showParcoursLink ? (
            <Link href="/app" className={btn.icon} aria-label="Parcours" title="Parcours">
              <BookOpen size={18} aria-hidden />
            </Link>
          ) : null}
          <Link href="/app/profile" className={btn.icon} aria-label="Mon profil" title="Mon profil">
            <CircleUserRound size={18} aria-hidden />
          </Link>
          {stageUnlocked ? (
            <Link href="/app/stage" className={btn.icon} aria-label="Stage" title="Stage">
              <Briefcase size={18} aria-hidden />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void onLogout()}
            className={btn.icon}
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <LogOut size={18} aria-hidden />
          </button>
        </nav>
      </div>
    </header>
  );
}
