import { rejoindre } from "./content";
import { Reveal } from "../landing/Reveal";

export function RejoindreSocialProof() {
  const t = rejoindre.socialProof;
  return (
    <section className="rejoindre-section rejoindre-social-proof" aria-label="Chiffres clés">
      <div className="rejoindre-container">
        <Reveal>
          <div className="rejoindre-stats-grid">
            {t.stats.map((stat) => (
              <div key={stat.label} className="rejoindre-stat">
                <span className="rejoindre-stat-value">{stat.value}</span>
                <span className="rejoindre-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
          <p className="rejoindre-social-note">{t.sectorNote}</p>
        </Reveal>
      </div>
    </section>
  );
}
