import Image from "next/image";
import { rejoindre } from "./content";
import { Reveal } from "../landing/Reveal";
import { AirplaneIcon } from "../landing/icons/Airplane";

export function RejoindreBenefits() {
  const t = rejoindre.benefits;
  return (
    <section id="benefices" className="rejoindre-section scroll-mt-20" aria-label="Bénéfices">
      <div className="rejoindre-container">
        <Reveal>
          <p className="landing-section-kicker">
            <AirplaneIcon className="landing-kicker-plane" />
            {t.kicker}
          </p>
          <h2 className="landing-h2 max-w-3xl">{t.headline}</h2>
        </Reveal>
        <div className="rejoindre-benefits-grid mt-10">
          {t.items.map((item, index) => (
            <Reveal key={item.title} delayMs={index * 90} className="rejoindre-benefit-card">
              <div className="rejoindre-benefit-photo">
                <Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
              </div>
              <h3 className="rejoindre-benefit-title">{item.title}</h3>
              <p className="rejoindre-benefit-desc">{item.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
