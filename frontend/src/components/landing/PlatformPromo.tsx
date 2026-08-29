import Link from "next/link";
import { Check } from "lucide-react";
import { iat } from "./content";
import { Reveal } from "./Reveal";

/** Mid-page promotion of the actual e-learning platform — distinct from the hero CTA, reinforcing why to join beyond the institutional pitch. */
export function LandingPlatformPromo() {
  return (
    <section className="landing-section landing-platform-promo" aria-label="La plateforme e-learning">
      <div className="landing-container">
        <Reveal className="landing-platform-card">
          <div className="landing-platform-glow" aria-hidden="true" />
          <div>
            <p className="landing-section-kicker" style={{ color: "var(--gold-400)" }}>
              Espace apprenant
            </p>
            <h2 className="landing-platform-title">
              Votre plateforme e-learning vous attend
            </h2>
            <p className="landing-platform-text">
              Suivez vos modules, vos évaluations et votre progression en ligne, en complément des
              cours en présentiel — un seul espace du premier jour jusqu&apos;au diplôme.
            </p>
            <div className="landing-platform-actions">
              <Link href="/register" className="landing-btn-glow landing-btn-lg">
                Rejoindre la plateforme
              </Link>
              <Link href="/login" className="landing-btn-outline-light landing-btn-lg">
                Se connecter
              </Link>
            </div>
          </div>
          <ul className="landing-platform-list">
            {iat.platformBenefits.map((item) => (
              <li key={item} className="landing-platform-item">
                <span className="landing-platform-item-icon">
                  <Check size={16} strokeWidth={3} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
