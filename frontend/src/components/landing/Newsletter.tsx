"use client";

import { FormEvent, useState } from "react";
import { AirplaneIcon } from "./icons/Airplane";

export function LandingNewsletter() {
  const [done, setDone] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(true);
    e.currentTarget.reset();
  }

  return (
    <section className="landing-newsletter" aria-labelledby="newsletter-heading">
      <div className="landing-container">
        <div className="landing-newsletter-card">
          <div className="landing-newsletter-copy">
            <p className="landing-section-kicker">
              <AirplaneIcon className="landing-kicker-plane" />
              Newsletter
            </p>
            <h2 id="newsletter-heading" className="landing-newsletter-title">
              Restez informé
            </h2>
            <p className="landing-newsletter-text">
              Recevez les actualités formations IAT Academy et les ouvertures de sessions.
            </p>
          </div>

          <form onSubmit={onSubmit} className="landing-newsletter-form">
            <label className="landing-newsletter-label" htmlFor="newsletter-email">
              Adresse email
            </label>
            <div className="landing-newsletter-row">
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="votre@email.com…"
                className="landing-newsletter-input"
              />
              <button type="submit" className="landing-btn-glow landing-newsletter-submit">
                S&apos;abonner
              </button>
            </div>
            {done && (
              <p className="landing-newsletter-thanks" role="status" aria-live="polite">
                Merci — inscription enregistrée (démo).
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
