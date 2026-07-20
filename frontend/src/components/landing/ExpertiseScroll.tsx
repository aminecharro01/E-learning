"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { iat } from "./content";
import { AirplaneIcon } from "./icons/Airplane";
import { Reveal } from "./Reveal";

/**
 * Premium scroll experience: vertical scroll drives horizontal panel movement (desktop).
 * Falls back to vertical cards on mobile / reduced motion.
 */
export function LandingExpertiseScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [useScrollPin, setUseScrollPin] = useState(false);

  const updateLayout = useCallback(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const pin = desktop && !reduced;
    setUseScrollPin(pin);

    if (!pin) {
      section.style.height = "";
      track.style.transform = "";
      return;
    }

    const scrollDistance = Math.max(track.scrollWidth - window.innerWidth, 0);
    section.style.height = `${window.innerHeight + scrollDistance}px`;
  }, []);

  useEffect(() => {
    updateLayout();
    window.addEventListener("resize", updateLayout, { passive: true });

    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", updateLayout);
    }

    const observer = new ResizeObserver(() => updateLayout());
    observer.observe(track);
    return () => {
      window.removeEventListener("resize", updateLayout);
      observer.disconnect();
    };
  }, [updateLayout]);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onScroll = () => {
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      if (!desktop || reduced) return;

      const total = section.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-section.getBoundingClientRect().top, 0), total);
      const ratio = total > 0 ? scrolled / total : 0;
      const maxTranslate = Math.max(track.scrollWidth - window.innerWidth, 0);

      track.style.transform = `translate3d(-${ratio * maxTranslate}px, 0, 0)`;
      setProgress(ratio);

      const cards = track.querySelectorAll<HTMLElement>("[data-flight-card]");
      if (!cards.length) return;
      const viewportCenter = ratio * maxTranslate + window.innerWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((card, i) => {
        const center = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActiveIndex(best);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [useScrollPin]);

  return (
    <section
      id="expertise"
      ref={sectionRef}
      className="landing-flight-section scroll-mt-20"
      aria-label="Domaines de formation"
    >
      <div className={`landing-flight-sticky ${useScrollPin ? "is-pinned" : ""}`}>
        <div className="landing-flight-sticky-inner">
          <div className="landing-container landing-flight-intro">
            <Reveal>
              <div className="landing-flight-intro-row">
                <div>
                  <p className="landing-section-kicker">
                    <AirplaneIcon className="landing-kicker-plane" />
                    Formations
                  </p>
                  <h2 className="landing-h2 landing-h2-light">Nos domaines d&apos;expertise</h2>
                  <p className="landing-flight-hint">
                    {useScrollPin
                      ? "Faites défiler pour explorer chaque filière"
                      : "Parcourez nos filières aviation, maritime et tourisme"}
                  </p>
                </div>
                <div className="landing-flight-counter" aria-live="polite">
                  <span className="landing-flight-counter-num">
                    {String(activeIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="landing-flight-counter-sep">/</span>
                  <span className="landing-flight-counter-total">
                    {String(iat.expertise.length).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          <div
            ref={trackRef}
            className="landing-flight-track"
            role="list"
            aria-roledescription={useScrollPin ? "carrousel synchronisé au défilement" : "liste"}
          >
            {iat.expertise.map((item, index) => (
              <article
                key={item.id}
                data-flight-card
                role="listitem"
                className={`landing-flight-card ${index === activeIndex ? "is-active" : ""}`}
                aria-current={index === activeIndex ? "true" : undefined}
              >
                <div className="landing-flight-card-media">
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 92vw, 72vw"
                    className="object-cover"
                  />
                  <div className="landing-flight-card-gradient" />
                  <div className={`landing-flight-badge landing-badge-${item.accent}`}>
                    {item.subtitle}
                  </div>
                </div>
                <div className="landing-flight-card-body">
                  <h3 className="landing-flight-card-title">{item.title}</h3>
                  <p className="landing-flight-card-desc">{item.description}</p>
                </div>
              </article>
            ))}
          </div>

          {useScrollPin && (
            <div className="landing-flight-progress" aria-hidden>
              <div className="landing-flight-progress-bar" style={{ width: `${progress * 100}%` }} />
              <AirplaneIcon
                className="landing-flight-progress-plane"
                ariaHidden
                style={{ left: `calc(${progress * 100}% - 0.5rem)` }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
