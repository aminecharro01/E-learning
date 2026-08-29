import Link from "next/link";
import { rejoindre } from "./content";
import { Reveal } from "../landing/Reveal";

export function RejoindreFinalCta() {
  const t = rejoindre.finalCta;
  return (
    <section className="rejoindre-section rejoindre-final-cta" aria-label="Candidater">
      <div className="rejoindre-container">
        <Reveal className="rejoindre-final-cta-inner">
          <h2 className="landing-h2-light max-w-2xl">{t.headline}</h2>
          <p className="mt-3 max-w-xl landing-text-on-dark-muted">{t.sub}</p>
          <Link href="/register" className="landing-btn-glow landing-btn-lg mt-6">
            {t.ctaPrimary}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
