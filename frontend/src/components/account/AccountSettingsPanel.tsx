"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { changePassword, uploadMyAvatar } from "@/lib/api";
import type { User } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { resolveAssetUrl } from "@/lib/media";
import { btn, inputClass } from "@/lib/ui";
import { Loader } from "@/components/ui/Loader";
import { TwoFactorSection } from "./TwoFactorSection";
import { AvatarCropModal } from "./AvatarCropModal";

type Props = {
  user: User;
  onUserChange: (user: User) => void;
};

/** Avatar + 2FA + password — the account-settings pieces common to every role, shared
 * between the learner profile page and the staff self-service profile page so neither
 * has to leave their own space to manage their own account. */
export function AccountSettingsPanel({ user, onUserChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user.avatarAssetId) {
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
  }, [user.avatarAssetId]);

  function onAvatarChange(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choisissez une image (PNG, JPG, WEBP…).");
      return;
    }
    setError(null);
    setMessage(null);
    setPendingAvatarFile(file);
  }

  async function onAvatarCropped(croppedFile: File) {
    setUploading(true);
    try {
      const updated = await uploadMyAvatar(croppedFile);
      onUserChange(updated);
      setMessage("Photo de profil mise à jour.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Envoi impossible.");
    } finally {
      setUploading(false);
      setPendingAvatarFile(null);
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

  const initials =
    user.fullName
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "IA";

  return (
    <div className="space-y-6">
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
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => onAvatarChange(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={uploading}
                className={btn.primarySm}
                onClick={() => fileRef.current?.click()}
              >
                {uploading && <Loader size="sm" tone="current" />}
                {uploading ? "Envoi…" : avatarUrl ? "Changer la photo" : "Ajouter une photo"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <AvatarCropModal
        file={pendingAvatarFile}
        busy={uploading}
        onCancel={() => setPendingAvatarFile(null)}
        onCropped={(croppedFile) => void onAvatarCropped(croppedFile)}
      />

      <TwoFactorSection />

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
          {changingPwd && <Loader size="sm" tone="current" />}
          Changer le mot de passe
        </button>
      </form>
    </div>
  );
}
