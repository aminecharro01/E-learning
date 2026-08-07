"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProgress, getMyStageDossier, type LearnerDossier } from "@/lib/api";
import { StageDossierPanel } from "@/components/stage/StageDossierPanel";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LearnerStagePage() {
  const router = useRouter();
  const [dossier, setDossier] = useState<LearnerDossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);

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
        if (!unlocked) {
          router.replace("/app");
          return;
        }
        reload();
      })
      .catch(() => {
        setError("Connexion requise.");
        router.push("/login");
      });
  }, [reload, router]);

  if (allowed === false) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <LearnerAppHeader
        containerClassName="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
        stageUnlocked
      />

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
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
      </div>
    </main>
  );
}
