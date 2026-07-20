"use client";

import { FormEvent, useState } from "react";
import { iat } from "./content";

export function LandingContact() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const first = String(fd.get("firstname") || "").trim();
    const last = String(fd.get("lastname") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const message = String(fd.get("message") || "").trim();

    const subject = encodeURIComponent(`Contact IAT Academy — ${first} ${last}`);
    const body = encodeURIComponent(
      `Nom: ${first} ${last}\nEmail: ${email}\nTéléphone: ${phone}\n\n${message}`
    );
    window.location.href = `${iat.emailHref}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <section id="contact" className="landing-section scroll-mt-20 landing-contact">
      <div className="landing-container">
        <p className="landing-section-kicker">Contact</p>
        <h2 className="landing-h2">Parlons de votre projet</h2>
        <div className="mt-10 grid gap-10 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-2">
            <a href={iat.phoneHref} className="landing-contact-row">
              <span className="landing-contact-label">Téléphone</span>
              <span>{iat.phone}</span>
            </a>
            <a href={iat.emailHref} className="landing-contact-row">
              <span className="landing-contact-label">Email</span>
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
          </div>

          <form onSubmit={onSubmit} className="landing-form lg:col-span-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="landing-field">
                <span>Prénom</span>
                <input name="firstname" required placeholder="Amina" />
              </label>
              <label className="landing-field">
                <span>Nom</span>
                <input name="lastname" required placeholder="Benali" />
              </label>
              <label className="landing-field">
                <span>Email</span>
                <input name="email" type="email" required placeholder="vous@email.com" />
              </label>
              <label className="landing-field">
                <span>Téléphone</span>
                <input name="phone" type="tel" required placeholder="+212 …" />
              </label>
            </div>
            <label className="landing-field mt-4 block">
              <span>Message</span>
              <textarea name="message" required rows={4} placeholder="Votre message…" />
            </label>
            <button type="submit" className="landing-btn-primary mt-5">
              Envoyer
            </button>
        {sent && (
          <p className="mt-3 text-sm text-[var(--landing-primary)]" role="status" aria-live="polite">
                Votre client mail va s&apos;ouvrir — merci pour votre message.
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
