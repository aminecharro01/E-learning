"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Lock, Mail } from "lucide-react";
import { listJobOffersForLearner, type JobOffer } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconCompass } from "@/components/brand/IatIcons";

const CONTRACT_LABEL: Record<JobOffer["contractType"], string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  FREELANCE: "Freelance",
};

export default function LearnerJobsPage() {
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listJobOffersForLearner()
      .then(setOffers)
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 403) {
          setForbidden(true);
        } else {
          setError(err instanceof ApiClientError ? err.message : "Impossible de charger les offres.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <LearnerAppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="eyebrow">
          <IconCompass size={14} />
          Espace alumni
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-heading">Bourse à l&apos;emploi</h1>
        <p className="mt-1 text-sm text-muted">
          Offres réservées aux diplômés IAT Academy — partagées par notre réseau d&apos;entreprises partenaires.
        </p>

        <div className="mt-6">
          {loading ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : forbidden ? (
            <div className="card-theme flex items-start gap-3 rounded-xl p-5">
              <Lock size={20} className="mt-0.5 shrink-0 text-muted" aria-hidden />
              <div>
                <p className="font-medium text-heading">Réservé aux diplômés</p>
                <p className="mt-1 text-sm text-muted">
                  Terminez votre parcours (les 36 modules et l&apos;attestation) pour accéder à la bourse à l&apos;emploi.
                </p>
              </div>
            </div>
          ) : error ? (
            <p className="alert alert-error">{error}</p>
          ) : offers.length === 0 ? (
            <p className="text-sm text-muted">Aucune offre disponible pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {offers.map((o) => (
                <li key={o.id} className="card-theme rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-heading">{o.title}</p>
                      <p className="text-sm text-muted">
                        {o.company}
                        {o.location && ` — ${o.location}`}
                      </p>
                    </div>
                    <span className="badge-inline badge-gold">{CONTRACT_LABEL[o.contractType]}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-foreground">{o.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {o.applyUrl && (
                      <a
                        href={o.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <ExternalLink size={14} aria-hidden />
                        Postuler
                      </a>
                    )}
                    {o.contactEmail && (
                      <a
                        href={`mailto:${o.contactEmail}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <Mail size={14} aria-hidden />
                        {o.contactEmail}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
