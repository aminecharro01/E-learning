"use client";

import { FormEvent, useState } from "react";
import { submitContactMessage } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { iat } from "./content";
import { Reveal } from "./Reveal";

export function LandingContact() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const firstName = String(fd.get("firstname") || "").trim();
    const lastName = String(fd.get("lastname") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const message = String(fd.get("message") || "").trim();

    setLoading(true);
    try {
      const res = await submitContactMessage({ firstName, lastName, email, phone, message });
      setSuccess(res.message);
      form.reset();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Envoi impossible. Réessayez ou contactez-nous par téléphone."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="landing-section scroll-mt-20 landing-contact">
      <div className="landing-container">
        <Reveal>
          <p className="landing-section-kicker">Contact</p>
          <h2 className="landing-h2">Parlons de votre projet</h2>
        </Reveal>
        <div className="mt-10 grid gap-10 lg:grid-cols-5">
          <Reveal delayMs={80} className="space-y-5 lg:col-span-2">
            <a href={iat.phoneHref} className="landing-contact-row">
              <span className="landing-contact-label">Téléphone</span>
              <span>{iat.phone}</span>
            </a>
            <a href={iat.emailHref} className="landing-contact-row">
              <span className="landing-contact-label">Courriel</span>
              <span>{iat.email}</span>
            </a>
            <a
              href={iat.website}
              target="_blank"
              rel="noreferrer"
              className="landing-contact-row"
            >
              <span className="landing-contact-label">Site web</span>
              <span>iat-academie.com</span>
            </a>
          </Reveal>

          <Reveal delayMs={140} className="lg:col-span-3">
          <form onSubmit={onSubmit} className="landing-form" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="landing-field">
                <span>Prénom</span>
                <input
                  name="firstname"
                  required
                  maxLength={100}
                  autoComplete="given-name"
                  placeholder="Amina"
                  disabled={loading}
                />
              </label>
              <label className="landing-field">
                <span>Nom</span>
                <input
                  name="lastname"
                  required
                  maxLength={100}
                  autoComplete="family-name"
                  placeholder="Benali"
                  disabled={loading}
                />
              </label>
              <label className="landing-field">
                <span>Courriel</span>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  autoComplete="email"
                  placeholder="vous@email.com"
                  disabled={loading}
                />
              </label>
              <label className="landing-field">
                <span>Téléphone</span>
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={40}
                  autoComplete="tel"
                  placeholder="+212 …"
                  disabled={loading}
                />
              </label>
            </div>
            <label className="landing-field mt-4 block">
              <span>Message</span>
              <textarea
                name="message"
                required
                rows={4}
                maxLength={4000}
                placeholder="Votre message…"
                disabled={loading}
              />
            </label>
            <button type="submit" className="landing-btn-primary mt-5" disabled={loading}>
              {loading ? "Envoi…" : "Envoyer"}
            </button>
            {error && (
              <p className="mt-3 text-sm text-[var(--danger,#b83232)]" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p
                className="mt-3 text-sm text-[var(--landing-primary)]"
                role="status"
                aria-live="polite"
              >
                {success}
              </p>
            )}
          </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
