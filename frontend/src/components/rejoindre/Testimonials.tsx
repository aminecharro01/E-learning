import { rejoindre } from "./content";
import { RejoindreReveal } from "./RejoindreReveal";
import { AirplaneIcon } from "../landing/icons/Airplane";

export function RejoindreTestimonials() {
  const t = rejoindre.testimonials;
  return (
    <section id="temoignages" className="rejoindre-section scroll-mt-20 rejoindre-testimonials" aria-label="Témoignages">
      <div className="rejoindre-container">
        <RejoindreReveal>
          <p className="landing-section-kicker">
            <AirplaneIcon className="landing-kicker-plane" />
            {t.kicker}
          </p>
          <h2 className="landing-h2 max-w-3xl">{t.headline}</h2>
        </RejoindreReveal>
        <div className="rejoindre-testimonial-grid mt-10">
          {t.items.map((item, index) => (
            <RejoindreReveal key={item.name} delayMs={index * 90} className="rejoindre-testimonial-card">
              <p className="rejoindre-testimonial-quote">&ldquo;{item.quote}&rdquo;</p>
              <div className="rejoindre-testimonial-attribution">
                <span className="rejoindre-testimonial-avatar" aria-hidden="true">
                  {item.initials}
                </span>
                <span>
                  <span className="rejoindre-testimonial-name">{item.name}</span>
                  <span className="rejoindre-testimonial-role">{item.role}</span>
                </span>
              </div>
            </RejoindreReveal>
          ))}
        </div>
        <p className="rejoindre-testimonial-disclaimer">{t.note}</p>
      </div>
    </section>
  );
}
