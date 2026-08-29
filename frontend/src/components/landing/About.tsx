import { iat } from "./content";
import { AirplaneIcon, FlightPathDecor } from "./icons/Airplane";
import { Reveal } from "./Reveal";

const CARDS = [
  {
    eyebrow: "Notre école",
    text: iat.about,
    stub: "IAT",
    link: false,
  },
  {
    eyebrow: "Ce que vous développez",
    text: iat.coursesApproach,
    stub: "SKL",
    link: false,
  },
  {
    eyebrow: "Pédagogie",
    text: iat.method,
    stub: "MTD",
    link: true,
  },
] as const;

export function LandingAbout() {
  return (
    <section id="about" className="landing-section scroll-mt-20 landing-about iat-board">
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
            <div className="landing-about-cards mt-6">
              {iat.journey.map((step, index) => (
                <Reveal key={step.title} delayMs={index * 90}>
                  <article className="boarding-pass">
                    <div className="bp-main">
                      <p className="bp-eyebrow">
                        <AirplaneIcon className="landing-kicker-plane" />
                        Parcours
                      </p>
                      <h3 className="bp-title" style={{ fontSize: "1.35rem" }}>
                        {step.title}
                      </h3>
                      <p className="bp-sub">{step.description}</p>
                    </div>
                    <div className="bp-stub">
                      <span className="bp-gate">
                        <span>Année</span>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="bp-barcode" aria-hidden="true" />
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </Reveal>
          <Reveal delayMs={140} className="lg:col-span-7">
            <div className="landing-about-cards">
              {CARDS.map((card, index) => (
                <Reveal key={card.eyebrow} delayMs={index * 90}>
                  <article className="boarding-pass">
                    <div className="bp-main">
                      <p className="bp-eyebrow">
                        <AirplaneIcon className="landing-kicker-plane" />
                        {card.eyebrow}
                      </p>
                      <p className="bp-sub" style={{ marginBottom: card.link ? "0.5rem" : 0 }}>
                        {card.text}
                      </p>
                      {card.link && (
                        <a
                          href={iat.website}
                          target="_blank"
                          rel="noreferrer"
                          className="landing-about-link"
                        >
                          iat-academie.com →
                        </a>
                      )}
                    </div>
                    <div className="bp-stub">
                      <AirplaneIcon className="bp-stub-plane" ariaHidden />
                      <span className="bp-stub-label">{card.stub}</span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
