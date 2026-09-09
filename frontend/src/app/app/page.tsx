"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import {
  getMe,
  getMyCertificate,
  getMyProgress,
  getYearExam,
  type ProgressResponse,
  type YearExam,
} from "@/lib/api";
import type { Certificate, Module } from "@/types/domain";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import {
  IconBadge,
  IconCheck,
  IconCompass,
  IconPlane,
  IconTower,
  IconWing,
} from "@/components/brand/IatIcons";
import { groupUfs, yearLabel as formatYearLabel, type UfGroup } from "@/lib/programme";
import { btn } from "@/lib/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { BadgeStrip } from "@/components/ui/BadgeStrip";
import { AgendaWidget } from "@/components/ui/AgendaWidget";

const statusLabel: Record<string, string> = {
  LOCKED: "Verrouillé",
  AVAILABLE: "Disponible",
  IN_PROGRESS: "En cours",
  COMPLETED: "Validé",
};

function defaultExpandedUf(ufs: UfGroup[]): string | null {
  if (ufs.length === 0) return null;
  const active = ufs.find((uf) =>
    uf.modules.some(
      (m) => m.learnerStatus === "IN_PROGRESS" || m.learnerStatus === "AVAILABLE"
    )
  );
  return (active ?? ufs[0]).ufCode;
}

function statusBadgeClass(status: string) {
  if (status === "COMPLETED") return "badge-inline badge-success";
  if (status === "LOCKED") return "badge-inline badge-alert";
  if (status === "IN_PROGRESS") return "badge-inline badge-gold";
  return "badge-inline badge-navy";
}

function ModuleCard({ module, index }: { module: Module; index: number }) {
  const locked = module.learnerStatus === "LOCKED";
  const status = module.learnerStatus ?? "AVAILABLE";
  const fill = Math.max(
    0,
    Math.min(100, module.progressPercent ?? (status === "COMPLETED" ? 100 : 0))
  );
  const code = `M-${String(index + 1).padStart(2, "0")}`;

  const body = (
    <>
      <div className="course-body">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="course-tag">
            <IconTower size={14} />
            Module
          </span>
          <span className={statusBadgeClass(status)}>{statusLabel[status]}</span>
        </div>
        <div className="flex items-center gap-3">
          <ProgressRing percent={fill} size={48} strokeWidth={5} />
          <div className="min-w-0 flex-1">
            <div className="course-title">{module.title}</div>
            <div className="course-meta">
              {fill}% complété
              {status === "IN_PROGRESS" ? " · En vol" : ""}
            </div>
          </div>
        </div>
      </div>
      <div className="course-stub">
        {status === "COMPLETED" ? <IconCheck size={22} /> : <IconPlane size={22} />}
        <span className="course-stub-code">{code}</span>
      </div>
    </>
  );

  if (locked) {
    return <div className="course-card is-locked">{body}</div>;
  }

  return (
    <Link
      href={`/app/learn/${module.id}`}
      className="course-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
      {body}
    </Link>
  );
}

/** Le vrai flux LinkedIn pour les certifications — crée une entrée durable dans
 * "Licences et certifications" sur le profil, plutôt qu'un simple post dans le fil
 * (voir linkedin.com/help/linkedin/answer/a528030). Même mécanique que Coursera. */
function buildLinkedInAddToProfileUrl(certificate: Certificate): string {
  const issued = new Date(certificate.issuedAt);
  const certUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${certificate.verificationCode}`;
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: certificate.formationTitle,
    organizationName: "IAT Academy",
    issueYear: String(issued.getFullYear()),
    issueMonth: String(issued.getMonth() + 1),
    certUrl,
    certId: certificate.verificationCode,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

export default function AppHomePage() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [year2Access, setYear2Access] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUfs, setExpandedUfs] = useState<Set<string>>(new Set());
  const [ufInit, setUfInit] = useState(false);
  const [yearExam, setYearExam] = useState<YearExam | null>(null);

  useEffect(() => {
    Promise.allSettled([getMe(), getMyProgress(), getMyCertificate()]).then(
      ([meResult, progressResult, certificateResult]) => {
        if (meResult.status === "fulfilled") {
          setYear2Access(!!meResult.value.year2AccessEnabled);
        }
        if (progressResult.status === "fulfilled") {
          setProgress(progressResult.value);
          setCertificate(certificateResult.status === "fulfilled" ? certificateResult.value : null);
          // Fallback if /me failed: infer année 2 from unlocked year-2 modules
          if (meResult.status !== "fulfilled") {
            const unlockedY2 = progressResult.value.modules.some(
              (m) =>
                (m.yearNumber ?? 1) === 2 &&
                m.learnerStatus != null &&
                m.learnerStatus !== "LOCKED"
            );
            if (unlockedY2) setYear2Access(true);
          }
        } else {
          setError("Connexion requise ou serveur indisponible.");
        }
      }
    );
  }, []);

  const currentYear = year2Access ? 2 : 1;

  useEffect(() => {
    getYearExam(currentYear)
      .then(setYearExam)
      .catch(() => setYearExam(null));
  }, [currentYear]);

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

  const yearLabel = formatYearLabel(currentYear);
  const yearCompletion = useMemo(() => {
    if (yearModules.length === 0) return 0;
    const done = yearModules.filter((m) => m.learnerStatus === "COMPLETED").length;
    return Math.round((done * 1000) / yearModules.length) / 10;
  }, [yearModules]);

  const gateCode = currentYear === 2 ? "A2" : "A1";
  const flightCode = `IAT · ${String(currentYear).padStart(2, "0")}`;

  function toggleUf(ufCode: string) {
    setExpandedUfs((prev) => {
      const next = new Set(prev);
      if (next.has(ufCode)) next.delete(ufCode);
      else next.add(ufCode);
      return next;
    });
  }

  return (
    <main className="iat-board min-h-screen bg-background">
      <LearnerAppHeader showParcoursLink={false} stageUnlocked={stageUnlocked} />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-[0.09]"
          aria-hidden
          style={{
            background:
              "radial-gradient(55% 50% at 15% 0%, var(--gold-500), transparent 60%), radial-gradient(50% 45% at 85% 10%, var(--navy-soft), transparent 55%)",
          }}
        />

        {error && (
          <p className="alert alert-warning relative mb-6" aria-live="polite">
            {error}{" "}
            <Link href="/login" className="underline">
              Se connecter
            </Link>
          </p>
        )}

        {!progress && !error && (
          <div className="relative space-y-6" aria-label="Chargement de votre parcours" aria-busy="true">
            <Skeleton className="h-56 rounded-2xl" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {progress && (
          <div className="relative space-y-10">
            <section className="boarding-pass" aria-label="Embarquement et progression">
              <div className="bp-main">
                <span className="bp-eyebrow">
                  <IconPlane size={16} />
                  Embarquement — {yearLabel}
                </span>
                <h2 className="bp-title">
                  Reprenez
                  <br />
                  <span className="grad">votre vol d&apos;apprentissage.</span>
                </h2>
                <p className="bp-sub">
                  {progress.formationTitle} · {ufs.length} unités de formation ·{" "}
                  {yearModules.length} modules cette année.
                </p>

                <dl className="bp-meta">
                  <div>
                    <dt>From</dt>
                    <dd>{yearLabel}</dd>
                  </div>
                  <div>
                    <dt>To</dt>
                    <dd>
                      {progress.resumeModuleTitle
                        ? progress.resumeModuleTitle.slice(0, 28) +
                          (progress.resumeModuleTitle.length > 28 ? "…" : "")
                        : "Prochain module"}
                    </dd>
                  </div>
                  <div>
                    <dt>Progress</dt>
                    <dd>{yearCompletion}%</dd>
                  </div>
                </dl>

                <div
                  className="progress-wing"
                  role="progressbar"
                  aria-label="Progression de l'année"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={yearCompletion}
                >
                  <div style={{ width: `${yearCompletion}%` }} />
                </div>

                <div className="bp-actions">
                  {progress.currentModuleId && progress.resumeLessonId ? (
                    <Link
                      href={`/app/learn/${progress.currentModuleId}/s/${progress.resumeLessonId}`}
                      className={btn.primary}
                    >
                      <IconPlane size={16} />
                      Continuer où je me suis arrêté
                    </Link>
                  ) : (
                    <span className="badge-inline badge-gold">
                      <IconCompass size={14} />
                      Parcours à jour
                    </span>
                  )}
                  {certificate ? (
                    <span className="badge-inline badge-success">
                      <IconBadge size={14} />
                      Diplôme en cours de remise
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="bp-stub">
                <div className="bp-flight-code">{flightCode}</div>
                <div className="bp-gate">
                  <span>PORTE</span>
                  {gateCode}
                </div>
                <div className="bp-barcode" aria-hidden />
              </div>
              <div className="bp-notch" aria-hidden />
            </section>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <BadgeStrip />
              <AgendaWidget />
            </div>

            {certificate ? (
              <div className="alert alert-success flex items-start gap-3 rounded-xl border border-[var(--success)] bg-[var(--alert-success-bg)] p-4 text-[var(--alert-success-fg)]">
                <IconWing size={22} />
                <div>
                  <p className="font-semibold">Parcours terminé — diplôme en cours de remise</p>
                  <p className="mt-1 text-sm opacity-90">
                    Code : {certificate.verificationCode}
                    {certificate.physicallyDelivered ? " · déjà remis." : ""}
                  </p>
                  <a
                    href={buildLinkedInAddToProfileUrl(certificate)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0A66C2] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  >
                    Ajouter au profil LinkedIn
                  </a>
                </div>
              </div>
            ) : null}

            {yearExam && (
              <div
                className={`alert flex items-start gap-3 rounded-xl border p-4 ${
                  yearExam.unlocked
                    ? "border-[var(--gold-500)] bg-[color-mix(in_srgb,var(--gold-500)_10%,transparent)]"
                    : "border-theme"
                }`}
              >
                {yearExam.unlocked ? <IconBadge size={22} /> : <Lock size={20} aria-hidden />}
                <div className="flex-1">
                  <p className="font-semibold text-heading">{yearExam.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {yearExam.unlocked
                      ? "Toutes les UF de cette année sont terminées — vous pouvez passer l'examen de fin d'année."
                      : "Terminez toutes les UF de cette année (contenu + validations) pour débloquer cet examen."}
                  </p>
                  {yearExam.unlocked && yearModules[0] && (
                    <Link
                      href={`/app/learn/${yearModules[0].id}/quiz/${yearExam.quizId}`}
                      className={`${btn.primarySm} mt-3 inline-flex`}
                    >
                      <IconBadge size={14} />
                      Passer l&apos;examen
                    </Link>
                  )}
                </div>
              </div>
            )}

            <section>
              <div className="section-head">
                <span className="section-num">01</span>
                <h3 className="section-title">Unités de formation</h3>
              </div>
              <p className="section-desc">
                {yearLabel} — ouvrez une UF pour accéder à ses modules (cartes boarding pass).
              </p>

              {ufs.map((uf, ufIndex) => {
                const open = expandedUfs.has(uf.ufCode);
                return (
                  <div key={uf.ufCode} className="uf-panel">
                    <button
                      type="button"
                      onClick={() => toggleUf(uf.ufCode)}
                      className="uf-toggle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                      aria-expanded={open}
                    >
                      <div>
                        <div className="uf-toggle-title">{uf.ufTitle}</div>
                        <div className="uf-toggle-meta">
                          UF-{String(ufIndex + 1).padStart(2, "0")} · {uf.modules.length} module
                          {uf.modules.length > 1 ? "s" : ""}
                        </div>
                      </div>
                      <span className="text-muted" aria-hidden>
                        {open ? "▾" : "▸"}
                      </span>
                    </button>
                    {open ? (
                      <ul className="grid gap-4 border-t border-theme p-4 sm:grid-cols-2 lg:grid-cols-3">
                        {uf.modules.map((module, moduleIndex) => (
                          <li key={module.id}>
                            <ModuleCard module={module} index={moduleIndex} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
