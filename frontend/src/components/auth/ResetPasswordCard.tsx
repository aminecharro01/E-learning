"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { IconHome, IconPlane } from "@/components/brand/IatIcons";
import { EyeCloseIcon, EyeIcon } from "@/components/auth/AuthIcons";
import { passwordStrengthLabel } from "@/components/auth/AuthRunwaySubmit";
import "./auth-boarding.css";

export default function ResetPasswordCard() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => passwordStrengthLabel(password), [password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Serveur indisponible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="iat-board auth-board">
      <div className="auth-board-bg" aria-hidden />

      <Link href="/" className="auth-board-home" aria-label="Retour à l'accueil">
        <IconHome size={20} />
      </Link>

      <section className="boarding-pass auth-pass" aria-label="Réinitialisation du mot de passe">
        <div className="bp-main">
          <span className="bp-eyebrow">
            <IconPlane size={14} />
            Récupération d&apos;accès
          </span>

          {done ? (
            <div className="auth-pass-success">
              <h1 className="bp-title">
                Mot de passe <span className="grad">mis à jour</span>
              </h1>
              <p className="bp-sub">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <Link href="/login" className="auth-pass-submit" style={{ display: "inline-flex" }}>
                Aller à la connexion
              </Link>
            </div>
          ) : !token ? (
            <>
              <h1 className="bp-title">
                Lien <span className="grad">invalide</span>
              </h1>
              <p className="bp-sub">
                Ce lien de réinitialisation est incomplet ou invalide. Demandez-en un nouveau.
              </p>
              <Link href="/forgot-password" className="auth-pass-submit" style={{ display: "inline-flex" }}>
                Redemander un lien
              </Link>
            </>
          ) : (
            <>
              <h1 className="bp-title">
                Nouveau <span className="grad">mot de passe</span>
              </h1>
              <p className="bp-sub">Choisissez un nouveau mot de passe pour votre compte.</p>

              {error && (
                <p className="auth-pass-alert" aria-live="polite">
                  {error}
                </p>
              )}

              <form onSubmit={onSubmit} className="auth-pass-form">
                <div className="auth-pass-field">
                  <label htmlFor="reset-password">Nouveau mot de passe</label>
                  <div className="auth-pass-input-wrap">
                    <input
                      id="reset-password"
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
                  <label htmlFor="reset-confirm">Confirmer le mot de passe</label>
                  <input
                    id="reset-confirm"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="8 caractères min."
                  />
                </div>
                <button type="submit" disabled={loading} className="auth-pass-submit">
                  {loading ? "Enregistrement…" : "Réinitialiser le mot de passe"}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="bp-stub">
          <div className="bp-flight-code">IAT · RÉCUPÉRATION</div>
          <div className="bp-gate">
            <span>PORTE</span>
            PW
          </div>
          <div className="bp-barcode" aria-hidden />
        </div>
        <div className="bp-notch" aria-hidden />
      </section>
    </div>
  );
}
