import { iat } from "./content";
import { AirplaneIcon, FlightPathDecor } from "./icons/Airplane";
import { Reveal } from "./Reveal";

export function LandingAbout() {
  return (
    <section id="about" className="landing-section scroll-mt-20 landing-about">
      <FlightPathDecor className="landing-about-paths" />
      <div className="landing-container relative z-[1]">
        <Reveal>
          <p className="landing-section-kicker">
            <AirplaneIcon className="landing-kicker-plane" />
            À propos
          </p>
          <h2 className="landing-h2 max-w-3xl">{iat.aboutLead}</h2>
        </Reveal>
        <div className="mt-12 grid gap-8 lg:grid-cols-12">
          <Reveal delayMs={80} className="lg:col-span-5">
            <blockquote className="landing-about-quote">
              <p>{iat.mission}</p>
            </blockquote>
            <div className="landing-about-grid mt-6">
              {iat.journey.map((step) => (
                <div key={step.title} className="landing-glass-card">
                  <h3 className="landing-glass-card-title">{step.title}</h3>
                  <p className="landing-glass-card-text">{step.description}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delayMs={140} className="lg:col-span-7">
            <div className="landing-about-grid">
              <div className="landing-glass-card">
                <h3 className="landing-glass-card-title">Notre école</h3>
                <p className="landing-glass-card-text">{iat.about}</p>
              </div>
              <div className="landing-glass-card">
                <h3 className="landing-glass-card-title">Ce que vous développez</h3>
                <p className="landing-glass-card-text">{iat.coursesApproach}</p>
              </div>
              <div className="landing-glass-card landing-glass-card-accent">
                <h3 className="landing-glass-card-title">Pédagogie</h3>
                <p className="landing-glass-card-text">{iat.method}</p>
                <a
                  href={iat.website}
                  target="_blank"
                  rel="noreferrer"
                  className="landing-about-link"
                >
                  iat-academie.com →
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
