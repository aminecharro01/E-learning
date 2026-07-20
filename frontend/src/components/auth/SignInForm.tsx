"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { AirplaneIcon } from "@/components/landing/icons/Airplane";
import { iat } from "@/components/landing/content";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/components/auth/AuthIcons";
import { AuthRunwaySubmit } from "@/components/auth/AuthRunwaySubmit";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const forgotHref = `${iat.emailHref}?subject=${encodeURIComponent("Mot de passe oublié — IAT Academy")}&body=${encodeURIComponent("Bonjour,\n\nJe souhaite réinitialiser mon mot de passe pour le compte :\n\nEmail : \n\nMerci.")}`;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      void keepLoggedIn;
      await new Promise((r) => setTimeout(r, 450));
      const next = searchParams.get("next");
      if (next) {
        router.push(next);
        return;
      }
      if (user.role === "ADMIN" || user.role === "FORMATEUR") {
        router.push("/admin");
      } else {
        router.push("/app");
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 401) setError("Identifiants incorrects.");
        else if (err.status === 429) setError("Trop de tentatives. Réessayez dans 15 minutes.");
        else setError(err.message);
      } else {
        setError("Serveur indisponible.");
      }
    } finally {
      setLoading(false);
    }
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
        Porte d&apos;embarquement
      </p>
      <h1 className="auth-title">Accès à bord</h1>
      <p className="auth-subtitle">
        Connectez-vous pour accéder à votre espace apprenant ou formateur.
      </p>

      {error && (
        <p className="auth-alert" aria-live="polite">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">
            Email <span>*</span>
          </label>
          <input
            className="auth-input"
            type="email"
            id="login-email"
            name="email"
            placeholder="admin@iat-academy.local…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            spellCheck={false}
          />
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label className="auth-label" htmlFor="login-password">
              Mot de passe <span>*</span>
            </label>
            <a href={forgotHref} className="auth-forgot">
              Mot de passe oublié ?
            </a>
          </div>
          <div className="auth-input-wrap">
            <input
              className="auth-input"
              type={showPassword ? "text" : "password"}
              id="login-password"
              name="password"
              placeholder="Votre mot de passe…"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
        </div>

        <label className="auth-check">
          <input
            type="checkbox"
            id="keep-logged-in"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
          />
          <span>Rester connecté</span>
        </label>

        <AuthRunwaySubmit loading={loading}>
          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? "Embarquement…" : "Embarquer"}
          </button>
        </AuthRunwaySubmit>
        <p className="auth-gate-hint">Porte A12 — Session en cours</p>
      </form>

      <p className="auth-footer">
        Pas encore de compte ? <Link href="/register">Réserver votre place</Link>
      </p>
    </div>
  );
}
