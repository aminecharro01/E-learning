"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import type { User } from "@/types/domain";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { AccountSettingsPanel } from "@/components/account/AccountSettingsPanel";
import { btn } from "@/lib/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { BadgeStrip } from "@/components/ui/BadgeStrip";

const paymentLabel: Record<string, string> = {
  PENDING: "En attente de paiement",
  PAID: "Payé",
  EXEMPTED: "Exonéré",
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((me) => setUser(me))
      .catch(() => {
        setError("Connexion requise.");
        router.push("/login");
      });
  }, [router]);

  if (!user && !error) {
    return (
      <main className="min-h-screen bg-background p-8">
        <Skeleton card className="mx-auto h-64 max-w-2xl rounded-2xl" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <LearnerAppHeader containerClassName="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6" />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {error && (
          <p className="alert alert-warning" aria-live="polite">
            {error}
          </p>
        )}

        {user && (
          <>
            <AccountSettingsPanel user={user} onUserChange={setUser} />

            <section className="card-theme rounded-2xl p-6">
              <p className="text-sm font-semibold text-primary">Badges</p>
              <div className="mt-4">
                <BadgeStrip />
              </div>
            </section>

            <section className="card-theme rounded-2xl p-6">
              <p className="text-sm font-semibold text-primary">Messagerie & devoirs</p>
              <p className="mt-1 text-xs text-muted">Échangez avec votre formateur, déposez vos devoirs.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/app/messages" className={btn.secondarySm}>
                  Ouvrir la messagerie
                </Link>
                <Link href="/app/assignments" className={btn.secondarySm}>
                  Mes devoirs
                </Link>
              </div>
            </section>

            <section className="card-theme rounded-2xl p-6">
              <p className="text-sm font-semibold text-primary">Informations personnelles</p>
              <p className="mt-1 text-xs text-muted">Lecture seule — modification réservée à l&apos;admin.</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Civilité</dt>
                  <dd className="font-medium text-heading">
                    {user.civility === "MR"
                      ? "Mr"
                      : user.civility === "MME"
                        ? "Mme"
                        : user.civility === "MLLE"
                          ? "Mlle"
                          : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Nom complet</dt>
                  <dd className="font-medium text-heading">{user.fullName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Courriel</dt>
                  <dd className="font-medium text-heading">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-muted">Téléphone</dt>
                  <dd className="font-medium text-heading">{user.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Pays</dt>
                  <dd className="font-medium text-heading">{user.country || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Ville</dt>
                  <dd className="font-medium text-heading">{user.city || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Niveau d&apos;études</dt>
                  <dd className="font-medium text-heading">{user.educationLevel || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Dernier établissement</dt>
                  <dd className="font-medium text-heading">{user.lastSchoolType || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">CIN / pièce d&apos;identité</dt>
                  <dd className="font-medium text-heading">{user.cin || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Date de naissance</dt>
                  <dd className="font-medium text-heading">{user.birthDate || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Adresse</dt>
                  <dd className="font-medium text-heading">{user.address || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Statut</dt>
                  <dd className="font-medium text-heading">
                    {user.enabled ? "Activé" : "En attente d'activation"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Paiement</dt>
                  <dd className="font-medium text-heading">
                    Hors plateforme ({user.paymentStatus ? paymentLabel[user.paymentStatus] : "—"})
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Année d&apos;inscription</dt>
                  <dd className="font-medium text-heading">{user.enrollmentYear ?? "—"}</dd>
                </div>
              </dl>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
