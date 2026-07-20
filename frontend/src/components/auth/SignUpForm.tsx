"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { register } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { AirplaneIcon } from "@/components/landing/icons/Airplane";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/components/auth/AuthIcons";
import { AuthRunwaySubmit, passwordStrengthLabel } from "@/components/auth/AuthRunwaySubmit";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => passwordStrengthLabel(password), [password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accepted) {
      setError("Veuillez accepter les conditions d'utilisation.");
      return;
    }
    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await register(email, password, fullName);
      await new Promise((r) => setTimeout(r, 500));
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Inscription impossible. Vérifiez les informations."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-card auth-success-card">
        <div className="auth-success-badge" aria-hidden>
          <AirplaneIcon className="auth-success-plane" />
        </div>
        <p className="auth-kicker">
          <AirplaneIcon className="auth-kicker-plane" />
          Carte d&apos;embarquement
        </p>
        <h1 className="auth-title">Compte créé</h1>
        <p className="auth-subtitle">
          Votre accès apprenant IAT Academy est prêt. Vous pouvez maintenant vous connecter.
        </p>
        <div className="auth-boarding-pass">
          <p className="auth-boarding-label">Passager</p>
          <p className="auth-boarding-value">
            {firstName} {lastName}
          </p>
          <p className="auth-boarding-label">Email</p>
          <p className="auth-boarding-value">{email}</p>
          <p className="auth-boarding-label">Statut</p>
          <p className="auth-boarding-value auth-boarding-status">Confirmé ✓</p>
        </div>
        <Link href="/login" className="auth-submit auth-success-cta">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <Link href="/" className="auth-mobile-brand">
        <AirplaneIcon className="auth-mobile-brand-plane" />
        <span className="auth-mobile-brand-mark">IAT</span>
        <span className="auth-mobile-brand-name">Academy</span>
      </Link>

      <Link href="/" className="auth-back">
        <ChevronLeftIcon />
        Retour à l&apos;accueil
      </Link>

      <p className="auth-kicker">
        <AirplaneIcon className="auth-kicker-plane" />
        Nouvelle réservation
      </p>
      <h1 className="auth-title">Réserver votre place</h1>
      <p className="auth-subtitle">
        Rejoignez les apprenants en aviation, maritime et tourisme.
      </p>

      {error && (
        <p className="auth-alert" aria-live="polite">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-grid-2">
          <div className="auth-field">
            <label className="auth-label" htmlFor="fname">
              Prénom <span>*</span>
            </label>
            <input
              className="auth-input"
              type="text"
              id="fname"
              name="fname"
              placeholder="Prénom…"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="lname">
              Nom <span>*</span>
            </label>
            <input
              className="auth-input"
              type="text"
              id="lname"
              name="lname"
              placeholder="Nom…"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="email">
            Email <span>*</span>
          </label>
          <input
            className="auth-input"
            type="email"
            id="email"
            name="email"
            placeholder="vous@email.com…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            spellCheck={false}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="register-password">
            Mot de passe <span>*</span>
          </label>
          <div className="auth-input-wrap">
            <input
              className="auth-input"
              id="register-password"
              name="password"
              placeholder="8 caractères minimum…"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="auth-strength" aria-live="polite">
              <div className="auth-strength-bar">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`auth-strength-segment ${strength.level >= step ? "is-active" : ""}`}
                  />
                ))}
              </div>
              <p className="auth-strength-label">{strength.label}</p>
            </div>
          )}
        </div>

        <label className="auth-check">
          <input
            type="checkbox"
            id="accept-terms"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            En créant un compte, vous acceptez les <strong>conditions d&apos;utilisation</strong> et
            la <strong>politique de confidentialité</strong>.
          </span>
        </label>

        <AuthRunwaySubmit loading={loading}>
          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? "Confirmation…" : "Confirmer l'inscription"}
          </button>
        </AuthRunwaySubmit>
      </form>

      <p className="auth-footer">
        Déjà un compte ? <Link href="/login">Embarquer</Link>
      </p>
    </div>
  );
}
