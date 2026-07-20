"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  downloadMyCertificate,
  getMyCertificate,
  getMyProgress,
  logout,
  type ProgressResponse,
} from "@/lib/api";
import type { Certificate } from "@/types/domain";
import { useRouter } from "next/navigation";
import { ApiClientError } from "@/lib/api-client";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { btn } from "@/lib/ui";

const statusLabel: Record<string, string> = {
  LOCKED: "Verrouillé",
  AVAILABLE: "Disponible",
  IN_PROGRESS: "En cours",
  COMPLETED: "Validé",
};

export default function AppHomePage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.allSettled([getMyProgress(), getMyCertificate()]).then(([progressResult, certificateResult]) => {
      if (progressResult.status === "fulfilled") {
        setProgress(progressResult.value);
        setCertificate(certificateResult.status === "fulfilled" ? certificateResult.value : null);
      } else {
        setError("Connexion requise ou serveur indisponible.");
      }
    });
  }, []);

  async function onLogout() {
    await logout().catch(() => undefined);
    router.push("/login");
  }

  async function onDownload() {
    setDownloading(true);
    try {
      const blob = await downloadMyCertificate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attestation-iat.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Attestation indisponible. Validez les 20 modules d'abord."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="app-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="eyebrow">IAT Academy</p>
            <h1 className="text-xl font-bold tracking-tight text-heading">Espace apprenant</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button onClick={onLogout} className={btn.secondarySm}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

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
                    <p className="text-sm font-semibold text-primary">Votre parcours</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-heading sm:text-3xl">
                      {progress.formationTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Progressez à votre rythme et reprenez votre formation là où vous l&apos;avez laissée.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary px-4 py-3 text-center text-[var(--primary-fg)] shadow-sm">
                    <strong className="block text-2xl font-bold tabular-nums">
                      {progress.completionPercent}%
                    </strong>
                    <span className="text-xs font-medium opacity-90">terminé</span>
                  </div>
                </div>
                <div
                  className="progress-track mt-6 h-2.5"
                  role="progressbar"
                  aria-label="Progression globale"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.completionPercent}
                >
                <div
                    className="progress-fill h-full"
                  style={{ width: `${progress.completionPercent}%` }}
                />
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
                <div className="m-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[var(--alert-success-bg)] p-4 text-[var(--alert-success-fg)] sm:m-6">
                  <div>
                    <p className="text-sm font-semibold">Attestation disponible</p>
                    <p className="mt-1 text-xs opacity-90">
                      Code : {certificate.verificationCode} — délivrée le{" "}
                      {new Intl.DateTimeFormat("fr-FR").format(new Date(certificate.issuedAt))}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={() => void onDownload()}
                    className={btn.successSm}
                  >
                    {downloading ? "…" : "Télécharger le PDF"}
                  </button>
                </div>
              ) : (
                <p className="border-t border-theme px-6 py-4 text-xs text-muted">
                  L&apos;attestation PDF sera proposée ici lorsque les 20 modules seront validés.
                </p>
              )}
            </section>

            <div className="mt-10 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">Programme</p>
                <h3 className="mt-1 text-xl font-bold tracking-tight text-heading">20 modules</h3>
              </div>
              <p className="text-sm text-muted">Sélectionnez un module pour continuer</p>
            </div>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {progress.modules.map((module) => {
                const locked = module.learnerStatus === "LOCKED";
                const status = module.learnerStatus ?? "AVAILABLE";
                const cardContent = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--neutral)] text-sm font-bold tabular-nums text-[var(--neutral-fg)]">
                        {module.orderIndex + 1}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status === "COMPLETED" ? "bg-[var(--alert-success-bg)] text-[var(--alert-success-fg)]" : "bg-surface-2 text-muted"}`}>
                        {statusLabel[status]}
                      </span>
                    </div>
                    <p className="mt-4 line-clamp-2 font-semibold leading-6 text-heading">{module.title}</p>
                  </>
                );
                return (
                  <li key={module.id}>
                    {locked ? (
                      <div className="card-theme min-h-32 rounded-xl bg-surface-2 p-4 opacity-70">
                        {cardContent}
                      </div>
                    ) : (
                      <Link
                        href={`/app/learn/${module.id}`}
                        className="card-theme block min-h-32 rounded-xl p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] motion-reduce:transform-none"
                      >
                        {cardContent}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
