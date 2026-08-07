"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { changePassword, confirmTotp, disableTotp, enableTotp, getMe, uploadMyAvatar } from "@/lib/api";
import type { User } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { resolveAssetUrl } from "@/lib/media";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { btn, inputClass } from "@/lib/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { BadgeStrip } from "@/components/ui/BadgeStrip";

const paymentLabel: Record<string, string> = {
  PENDING: "En attente de paiement",
  PAID: "Payé",
  EXEMPTED: "Exonéré",
};

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    getMe()
      .then((me) => setUser(me))
      .catch(() => {
        setError("Connexion requise.");
        router.push("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!user?.avatarAssetId) {
      setAvatarUrl(null);
      return;
    }
    let cancelled = false;
    resolveAssetUrl(user.avatarAssetId)
      .then((url) => {
        if (!cancelled) setAvatarUrl(url);
      })
      .catch(() => {
        if (!cancelled) setAvatarUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.avatarAssetId]);

  async function onAvatarChange(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choisissez une image (PNG, JPG, WEBP…).");
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await uploadMyAvatar(file);
      setUser(updated);
      setMessage("Photo de profil mise à jour.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Envoi impossible.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setChangingPwd(true);
    setError(null);
    setMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Mot de passe modifié.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Changement de mot de passe impossible.");
    } finally {
      setChangingPwd(false);
    }
  }

  if (!user && !error) {
    return (
      <main className="min-h-screen bg-background p-8">
        <Skeleton card className="mx-auto h-64 max-w-2xl rounded-2xl" />
      </main>
    );
  }

  const initials =
    user?.fullName
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "IA";

  return (
    <main className="min-h-screen bg-background">
      <LearnerAppHeader containerClassName="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6" />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {error && (
          <p className="alert alert-warning" aria-live="polite">
            {error}
          </p>
        )}
        {message && (
          <p className="alert alert-success" aria-live="polite">
            {message}
          </p>
        )}

        {user && (
          <>
            <section className="card-theme rounded-2xl p-6">
              <div className="flex flex-wrap items-center gap-5">
                <div className="relative h-24 w-24 overflow-hidden rounded-full bg-surface-2 ring-2 ring-[color-mix(in_srgb,var(--primary)_35%,transparent)]">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">Photo de profil</p>
                  <p className="mt-1 text-sm text-muted">
                    Vous pouvez changer uniquement votre photo. Les autres informations sont gérées
                    par l&apos;administration.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => void onAvatarChange(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      className={btn.primarySm}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? "Envoi…" : avatarUrl ? "Changer la photo" : "Ajouter une photo"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="card-theme rounded-2xl p-6">
              <p className="text-sm font-semibold text-primary">Badges</p>
              <div className="mt-4">
                <BadgeStrip />
              </div>
            </section>

            <TwoFactorSection />

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

        <form onSubmit={onChangePassword} className="card-theme space-y-4 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-heading">Mot de passe</h2>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Mot de passe actuel</span>
            <input
              type="password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Nouveau mot de passe</span>
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" disabled={changingPwd} className={btn.secondary}>
            {changingPwd ? "…" : "Changer le mot de passe"}
          </button>
        </form>
      </div>
    </main>
  );
}

function TwoFactorSection() {
  const [secret, setSecret] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onEnable() {
    setBusy(true);
    setMsg(null);
    try {
      setSecret(await enableTotp());
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    setBusy(true);
    setMsg(null);
    try {
      await confirmTotp(code);
      setEnabled(true);
      setSecret(null);
      setCode("");
      setMsg("2FA activée.");
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : "Code invalide.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setBusy(true);
    setMsg(null);
    try {
      await disableTotp(code);
      setEnabled(false);
      setCode("");
      setMsg("2FA désactivée.");
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : "Code invalide.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-theme rounded-2xl p-6">
      <p className="text-sm font-semibold text-primary">Authentification à deux facteurs</p>
      <p className="mt-1 text-xs text-muted">
        Optionnelle — code à 6 chiffres depuis une application type Google Authenticator.
      </p>
      {msg && <p className="mt-2 text-xs">{msg}</p>}

      {!secret && !enabled && (
        <button type="button" className={`${btn.secondarySm} mt-3`} disabled={busy} onClick={() => void onEnable()}>
          Activer la 2FA
        </button>
      )}

      {secret && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-body">
            Ajoutez ce secret dans votre application d&apos;authentification : <code className="text-heading">{secret.secret}</code>
          </p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Code à 6 chiffres"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button type="button" className={btn.primarySm} disabled={busy || code.length !== 6} onClick={() => void onConfirm()}>
              Confirmer
            </button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="mt-3 flex gap-2">
          <input
            className={inputClass}
            placeholder="Code à 6 chiffres pour désactiver"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <button type="button" className={btn.dangerSm} disabled={busy || code.length !== 6} onClick={() => void onDisable()}>
            Désactiver
          </button>
        </div>
      )}
    </section>
  );
}
