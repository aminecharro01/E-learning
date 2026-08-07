"use client";

import { FormEvent, useState } from "react";
import { subscribeNewsletter } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { AirplaneIcon } from "./icons/Airplane";

export function LandingNewsletter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") || "").trim();
    if (!email) {
      setError("Indiquez une adresse email.");
      return;
    }

    setLoading(true);
    try {
      const res = await subscribeNewsletter(email);
      setSuccess(res.message);
      form.reset();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Inscription impossible. Réessayez plus tard."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="landing-newsletter" aria-labelledby="newsletter-heading">
      <div className="landing-container">
        <div className="landing-newsletter-card">
          <div className="landing-newsletter-copy">
            <p className="landing-section-kicker">
              <AirplaneIcon className="landing-kicker-plane" />
              Infos & actualités
            </p>
            <h2 id="newsletter-heading" className="landing-newsletter-title">
              Restez informé
            </h2>
            <p className="landing-newsletter-text">
              Recevez les actualités formations IAT Academy et les ouvertures de sessions.
            </p>
          </div>

          <form onSubmit={onSubmit} className="landing-newsletter-form" noValidate>
            <label className="landing-newsletter-label" htmlFor="newsletter-email">
              Adresse courriel
            </label>
            <div className="landing-newsletter-row">
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                maxLength={255}
                autoComplete="email"
                placeholder="votre@email.com…"
                className="landing-newsletter-input"
                disabled={loading}
              />
              <button
                type="submit"
                className="landing-btn-glow landing-newsletter-submit"
                disabled={loading}
              >
                {loading ? "…" : "S'abonner"}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-[var(--danger,#b83232)]" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="landing-newsletter-thanks" role="status" aria-live="polite">
                {success}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
