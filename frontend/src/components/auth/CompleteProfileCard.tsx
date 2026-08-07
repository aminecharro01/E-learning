"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { completeProfile, getMe, uploadMyAvatar } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { IconPlane } from "@/components/brand/IatIcons";
import { EyeCloseIcon, EyeIcon } from "@/components/auth/AuthIcons";
import { passwordStrengthLabel } from "@/components/auth/AuthRunwaySubmit";
import "./auth-boarding.css";

export default function CompleteProfileCard() {
  const router = useRouter();
  const [fullName, setFullName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrengthLabel(password), [password]);

  useEffect(() => {
    getMe()
      .then((user) => {
        // Déjà complété (ou compte classique) : rien à faire ici.
        if (user.profileCompleted !== false) {
          router.replace("/app");
          return;
        }
        setFullName(user.fullName);
        setPhone(user.phone ?? "");
        setChecking(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await completeProfile({ email: email.trim(), phone: phone.trim(), newPassword: password });
      // La photo est optionnelle : son échec ne doit pas bloquer l'accès au compte,
      // le profil lui-même est déjà enregistré à ce stade.
      if (photo) {
        await uploadMyAvatar(photo).catch(() => undefined);
      }
      router.replace("/app");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Serveur indisponible.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="iat-board auth-board">
        <p className="bp-sub">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="iat-board auth-board">
      <div className="auth-board-bg" aria-hidden />

      <section className="boarding-pass auth-pass auth-pass-wide" aria-label="Finaliser mon compte">
        <div className="bp-main">
          <span className="bp-eyebrow">
            <IconPlane size={14} />
            Première connexion
          </span>

          <h1 className="bp-title">
            Bienvenue{fullName ? `, ${fullName.split(" ")[0]}` : ""} —{" "}
            <span className="grad">finalisez votre compte</span>
          </h1>
          <p className="bp-sub">
            Votre compte a été créé par l&apos;académie. Renseignez votre adresse e-mail et
            choisissez un mot de passe personnel : vous vous connecterez ensuite avec votre e-mail.
          </p>

          {error && (
            <p className="auth-pass-alert" aria-live="polite">
              {error}
            </p>
          )}

          <form onSubmit={onSubmit} className="auth-pass-form auth-pass-form-signup">
            <div className="auth-pass-grid">
              <div className="auth-pass-field">
                <label htmlFor="cp-email">Adresse e-mail</label>
                <input
                  id="cp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="vous@email.com"
                />
              </div>
              <div className="auth-pass-field">
                <label htmlFor="cp-phone">Téléphone</label>
                <input
                  id="cp-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  placeholder="+212 6 XX XX XX XX"
                />
              </div>
            </div>

            <div className="auth-pass-grid">
              <div className="auth-pass-field">
                <label htmlFor="cp-password">Nouveau mot de passe</label>
                <div className="auth-pass-input-wrap">
                  <input
                    id="cp-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="8 caractères min."
                  />
                  <button
                    type="button"
                    className="auth-pass-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Masquer" : "Afficher"}
                  >
                    {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="auth-pass-strength" aria-live="polite">
                    <div className="auth-pass-strength-bar">
                      {[1, 2, 3].map((step) => (
                        <span key={step} className={strength.level >= step ? "is-active" : ""} />
                      ))}
                    </div>
                    <p>{strength.label}</p>
                  </div>
                )}
              </div>
              <div className="auth-pass-field">
                <label htmlFor="cp-confirm">Confirmer le mot de passe</label>
                <input
                  id="cp-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="8 caractères min."
                />
              </div>
            </div>

            <div className="auth-pass-field">
              <label htmlFor="cp-photo">Photo de profil (facultatif)</label>
              <input
                id="cp-photo"
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </div>

            <button type="submit" disabled={loading} className="auth-pass-submit">
              {loading ? "Enregistrement…" : "Accéder à ma formation"}
            </button>
          </form>
        </div>

        <div className="bp-stub">
          <div className="bp-flight-code">IAT · ACTIVATION</div>
          <div className="bp-gate">
            <span>PORTE</span>
            A0
          </div>
          <div className="bp-barcode" aria-hidden />
        </div>
        <div className="bp-notch" aria-hidden />
      </section>
    </div>
  );
}
