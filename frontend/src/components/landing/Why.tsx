import Image from "next/image";
import { iat } from "./content";
import { AirplaneIcon } from "./icons/Airplane";
import { Reveal } from "./Reveal";

export function LandingWhy() {
  return (
    <section id="why" className="landing-section scroll-mt-20 landing-why">
      <div className="landing-container">
        <Reveal>
          <p className="landing-section-kicker">
            <AirplaneIcon className="landing-kicker-plane" />
            Pourquoi IAT
          </p>
          <h2 className="landing-h2 max-w-3xl">
            Un cycle professionnel pensé pour l&apos;emploi
          </h2>
          <p className="mt-4 max-w-2xl text-lg landing-text-muted">
            Deux années, un diplôme, une immersion terrain — et un espace apprenant pour suivre votre progression.
          </p>
        </Reveal>
        <div className="landing-bento mt-12">
          {iat.why.map((item, index) => (
            <Reveal
              key={item.title}
              delayMs={index * 100}
              className={`landing-bento-item ${index === 0 ? "landing-bento-featured" : ""}`}
            >
              <article className="landing-bento-card">
                <div className="landing-bento-photo">
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes={index === 0 ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 25vw"}
                    className="object-cover"
                  />
                  <div className="landing-bento-overlay" />
                </div>
                <div className="landing-bento-content">
                  <h3 className="landing-bento-title">{item.title}</h3>
                  <p className="landing-bento-desc">{item.description}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
