"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { getMyProgress, getMyStageDossier, type LearnerDossier } from "@/lib/api";
import { StageDossierPanel } from "@/components/stage/StageDossierPanel";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LearnerStagePage() {
  const router = useRouter();
  const [dossier, setDossier] = useState<LearnerDossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [completionPercent, setCompletionPercent] = useState(0);

  const reload = useCallback(() => {
    getMyStageDossier()
      .then(setDossier)
      .catch(() => {
        setError("Connexion requise.");
        router.push("/login");
      });
  }, [router]);

  useEffect(() => {
    getMyProgress()
      .then((progress) => {
        const unlocked = progress.modules.some(
          (m) => m.ufCode === "UF 5" && m.learnerStatus && m.learnerStatus !== "LOCKED"
        );
        setAllowed(unlocked);
        setCompletionPercent(progress.completionPercent);
        if (!unlocked) {
          return;
        }
        reload();
      })
      .catch(() => {
        setError("Connexion requise.");
        router.push("/login");
      });
  }, [reload, router]);

  return (
    <main className="min-h-screen bg-background">
      <LearnerAppHeader stageUnlocked={allowed ?? undefined} />

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
        {allowed === false ? (
          <div className="card-theme flex items-start gap-3 rounded-xl p-5">
            <Lock size={20} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="font-medium text-heading">Section verrouillée</p>
              <p className="mt-1 text-sm text-muted">
                Le dossier Stage &amp; Soutenance s&apos;ouvre une fois l&apos;unité de formation « Stage en
                milieu réel » (UF 5) atteinte. Progression actuelle : {completionPercent}%.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">
              Déposez votre convention signée par l&apos;entreprise, votre rapport de stage et votre
              présentation de soutenance. Les documents de l&apos;académie (convention école, assurance)
              sont déposés par le directeur.
            </p>
            {error && <p className="alert alert-warning">{error}</p>}
            {!dossier && !error && (
              <Skeleton card className="h-48 rounded-2xl" />
            )}
            {dossier && <StageDossierPanel dossier={dossier} mode="learner" onChanged={reload} />}
          </>
        )}
      </div>
    </main>
  );
}
