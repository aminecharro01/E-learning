import Image from "next/image";
import Link from "next/link";
import { iat } from "./content";
import { AirplaneIcon, FlightPathDecor } from "./icons/Airplane";

export function LandingHero() {
  return (
    <section id="home" className="landing-hero scroll-mt-20">
      <div className="landing-hero-sky" aria-hidden />
      <FlightPathDecor className="landing-hero-paths" />
      <div className="landing-hero-horizon" aria-hidden />
      <AirplaneIcon className="landing-hero-plane landing-anim-float" ariaHidden />

      <div className="landing-container relative z-[1] grid items-center gap-12 pt-28 pb-20 lg:grid-cols-12 lg:gap-10 lg:pt-36 lg:pb-28">
        <div className="landing-anim-fade-up flex flex-col gap-7 lg:col-span-6">
          <p className="landing-eyebrow landing-eyebrow-glass">
            <AirplaneIcon className="landing-eyebrow-plane" />
            Aviation · Maritime · Tourisme
          </p>
          <h1 className="landing-h1 landing-h1-hero">
            <span className="landing-h1-brand">{iat.brand}</span>
            <span className="landing-h1-tagline">{iat.tagline}</span>
          </h1>
          <p className="landing-anim-fade-up-delay-1 max-w-xl text-lg leading-relaxed landing-text-on-dark-muted">
            {iat.subtitle}
          </p>
          <div className="landing-anim-fade-up-delay-2 flex flex-wrap gap-3">
            <Link href="/register" className="landing-btn-glow landing-btn-lg">
              Accéder à la plateforme
            </Link>
            <a href="#expertise" className="landing-btn-outline-light landing-btn-lg">
              Explorer les filières
            </a>
          </div>
          <ul className="landing-anim-fade-up-delay-3 landing-hero-chips">
            {iat.platformBenefits.map((item) => (
              <li key={item} className="landing-hero-chip">
                <span className="landing-hero-chip-dot" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="landing-anim-fade-up-delay-2 relative lg:col-span-6">
          <div className="landing-hero-photos">
            <div className="landing-hero-photo-main landing-hero-photo-glow">
              <Image
                src={iat.heroImage}
                alt={iat.heroImageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
              <div className="landing-hero-photo-overlay" />
              <div className="landing-hero-photo-caption">
                <p className="landing-text-on-dark-muted text-xs font-semibold tracking-[0.16em] uppercase">
                  {iat.fullName}
                </p>
                <p className="landing-text-on-dark mt-1 text-lg font-semibold">Learning by Doing</p>
              </div>
            </div>
            <div className="landing-hero-photo-secondary landing-anim-float">
              <Image
                src={iat.heroSecondaryImage}
                alt={iat.heroSecondaryAlt}
                fill
                sizes="240px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
