"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getMyProgress, logout } from "@/lib/api";
import type { User } from "@/types/domain";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { btn } from "@/lib/ui";

function greetingForNow(fullName: string | null | undefined): string {
  const hour = new Date().getHours();
  const salutation = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
  const name = fullName?.trim() || "apprenant";
  return `${salutation}, ${name}`;
}

function NavIcon({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
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
          <p className="eyebrow">IAT Academy</p>
          <h1 className="truncate text-xl font-bold tracking-tight text-heading">
            {user ? greetingForNow(user.fullName) : "Espace apprenant"}
          </h1>
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2" aria-label="Navigation apprenant">
          <ThemeToggleButton />
          {showParcoursLink ? (
            <Link href="/app" className={btn.icon} aria-label="Parcours" title="Parcours">
              <NavIcon>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <path d="M8 7h8M8 11h6" />
              </NavIcon>
            </Link>
          ) : null}
          <Link href="/app/profile" className={btn.icon} aria-label="Mon profil" title="Mon profil">
            <NavIcon>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
            </NavIcon>
          </Link>
          {stageUnlocked ? (
            <Link href="/app/stage" className={btn.icon} aria-label="Stage" title="Stage">
              <NavIcon>
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M3 12h18" />
              </NavIcon>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void onLogout()}
            className={btn.icon}
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <NavIcon>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </NavIcon>
          </button>
        </nav>
      </div>
    </header>
  );
}
