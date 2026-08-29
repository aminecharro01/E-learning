import { rejoindre } from "./content";
import { RejoindreReveal } from "./RejoindreReveal";
import { AirplaneIcon } from "../landing/icons/Airplane";

export function RejoindreHowItWorks() {
  const t = rejoindre.howItWorks;
  return (
    <section id="comment-ca-marche" className="rejoindre-section scroll-mt-20" aria-label="Comment ça marche">
      <div className="rejoindre-container">
        <RejoindreReveal>
          <p className="landing-section-kicker">
            <AirplaneIcon className="landing-kicker-plane" />
            {t.kicker}
          </p>
          <h2 className="landing-h2 max-w-3xl">{t.headline}</h2>
        </RejoindreReveal>
        <ol className="rejoindre-steps mt-10">
          {t.steps.map((step, index) => (
            <RejoindreReveal key={step.title} delayMs={index * 90} className="rejoindre-step">
              <span className="rejoindre-step-num" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="rejoindre-step-title">{step.title}</h3>
              <p className="rejoindre-step-desc">{step.description}</p>
            </RejoindreReveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
