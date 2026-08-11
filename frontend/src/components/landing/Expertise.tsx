"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { iat } from "./content";
import { Reveal } from "./Reveal";

export function LandingExpertise() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = iat.expertise.length;

  const scrollTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.querySelectorAll<HTMLElement>("[data-carousel-card]");
    const target = cards[i];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setIndex(i);
  }, []);

  const next = () => scrollTo((index + 1) % count);
  const prev = () => scrollTo((index - 1 + count) % count);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const cards = [...track.querySelectorAll<HTMLElement>("[data-carousel-card]")];
      if (!cards.length) return;
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((card, i) => {
        const center = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setIndex(best);
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((current) => {
        const nextIndex = (current + 1) % count;
        const track = trackRef.current;
        if (track) {
          const cards = track.querySelectorAll<HTMLElement>("[data-carousel-card]");
          cards[nextIndex]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
        }
        return nextIndex;
      });
    }, 5500);
    return () => window.clearInterval(id);
  }, [count]);

  return (
    <section id="expertise" className="landing-section scroll-mt-20">
      <div className="landing-container">
        <Reveal>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="landing-section-kicker">Formations</p>
              <h2 className="landing-h2">Nos domaines d&apos;expertise</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="landing-carousel-btn"
                onClick={prev}
                aria-label="Formation précédente"
              >
                <ArrowLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                className="landing-carousel-btn"
                onClick={next}
                aria-label="Formation suivante"
              >
                <ArrowRight size={18} aria-hidden />
              </button>
            </div>
          </div>
        </Reveal>

        <div
          ref={trackRef}
          className="landing-carousel-track"
          aria-roledescription="carousel"
          aria-label="Domaines de formation"
        >
          {iat.expertise.map((item) => (
            <article key={item.id} data-carousel-card className="landing-carousel-card group">
              <div className="landing-carousel-photo">
                <Image
                  src={item.image}
                  alt={item.imageAlt}
                  fill
                  sizes="(max-width: 768px) 85vw, 360px"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className={`landing-carousel-badge landing-badge-${item.accent}`}>
                  Domaine
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold tracking-[0.14em] text-[var(--landing-primary)] uppercase">
                  {item.subtitle}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--landing-ink)]">{item.title}</h3>
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[var(--landing-muted)]">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {iat.expertise.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Aller à ${item.title}`}
              aria-current={i === index}
              className={`landing-carousel-dot ${i === index ? "is-active" : ""}`}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
