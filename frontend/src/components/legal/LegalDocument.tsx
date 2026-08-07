import type { ReactNode } from "react";
import "@/components/landing/landing.css";
import "./legal.css";

export function LegalDocument({
  title,
  shortTitle,
  lastUpdated,
  version,
  intro,
  children,
}: {
  title: string;
  shortTitle: string;
  lastUpdated: string;
  version: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="legal-doc">
      <header className="legal-doc-header">
        <p className="landing-section-kicker">{shortTitle}</p>
        <h1 className="landing-h1 legal-doc-title">{title}</h1>
        <p className="legal-doc-meta">
          Version {version} — Mise à jour : {lastUpdated}
        </p>
        <p className="legal-doc-intro">{intro}</p>
      </header>
      <div className="legal-doc-body">{children}</div>
    </article>
  );
}

export function LegalSection({
  id,
  title,
  paragraphs,
  bullets,
}: {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}) {
  return (
    <section id={id} className="legal-section scroll-mt-24">
      <h2>{title}</h2>
      {paragraphs.map((p, index) => (
        <p key={`${id}-p-${index}`}>{p}</p>
      ))}
      {bullets && bullets.length > 0 ? (
        <ul>
          {bullets.map((item, index) => (
            <li key={`${id}-b-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
