"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { forgotPassword } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { IconHome, IconPlane } from "@/components/brand/IatIcons";
import "./auth-boarding.css";

export default function ForgotPasswordCard() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
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

      <section className="boarding-pass auth-pass" aria-label="Mot de passe oublié">
        <div className="bp-main">
          <span className="bp-eyebrow">
            <IconPlane size={14} />
            Récupération d&apos;accès
          </span>

          {sent ? (
            <div className="auth-pass-success">
              <h1 className="bp-title">
                E-mail <span className="grad">envoyé</span>
              </h1>
              <p className="bp-sub">
                Si un compte existe avec l&apos;adresse <strong>{email}</strong>, un lien de
                réinitialisation vient de lui être envoyé. Vérifiez votre boîte de réception.
              </p>
              <Link href="/login" className="auth-pass-submit" style={{ display: "inline-flex" }}>
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h1 className="bp-title">
                Mot de passe <span className="grad">oublié</span>
              </h1>
              <p className="bp-sub">
                Indiquez votre adresse e-mail — nous vous envoyons un lien pour réinitialiser votre
                mot de passe.
              </p>

              {error && (
                <p className="auth-pass-alert" aria-live="polite">
                  {error}
                </p>
              )}

              <form onSubmit={onSubmit} className="auth-pass-form">
                <div className="auth-pass-field">
                  <label htmlFor="forgot-email">Courriel</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    spellCheck={false}
                    placeholder="vous@email.com"
                  />
                </div>
                <button type="submit" disabled={loading} className="auth-pass-submit">
                  {loading ? "Envoi…" : "Envoyer le lien"}
                </button>
              </form>

              <p className="bp-sub" style={{ marginTop: "1rem" }}>
                <Link href="/login">Retour à la connexion</Link>
              </p>
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
