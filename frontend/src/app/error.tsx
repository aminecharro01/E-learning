"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { btn } from "@/lib/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Diagnostic only — never rendered to the user, who only sees the generic
    // message below (no stack trace, no raw error text).
    console.error("Erreur applicative non gérée :", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <BrandLogo href={null} size="lg" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--danger)]">Erreur</p>
        <h1 className="mt-2 text-2xl font-bold text-heading sm:text-3xl">Une erreur est survenue</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Quelque chose s&apos;est mal passé de notre côté. Réessayez, ou revenez à l&apos;accueil si le problème persiste.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className={btn.primary}>
          Réessayer
        </button>
        <Link href="/" className={btn.secondary}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
