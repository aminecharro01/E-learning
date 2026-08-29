"use client";

import Link from "next/link";
import { AirplaneIcon, FlightPathDecor } from "../landing/icons/Airplane";
import { rejoindre } from "./content";
import { useScrollProgress } from "./useScrollProgress";

/**
 * The one orchestrated cinematic moment on this page (see rejoindre.css
 * `.rejoindre-hero*` rules): a boarding pass card that gets "stamped" and
 * carried off on takeoff as the visitor scrolls past, built on the app's
 * existing boarding-pass/aviation motif. Headline + CTA are fully visible at
 * rest (progress 0) — the spectacle plays out AFTER the conversion content is
 * already on screen, never blocking it.
 *
 * All motion is `transform`/`opacity`/`filter` only, driven by a single
 * `--progress` custom property from useScrollProgress (GPU-safe, no layout
 * thrash). prefers-reduced-motion pins progress at 1 (static "departed"
 * state) in the hook itself.
 */
export function RejoindreHero() {
  const sceneRef = useScrollProgress<HTMLDivElement>();
  const t = rejoindre.hero;

  return (
    <section className="rejoindre-hero-scene" ref={sceneRef} aria-label="Introduction">
      <div className="rejoindre-hero-sticky">
        {/* depth-0: far background sky */}
        <div className="rejoindre-hero-layer rejoindre-depth-0" data-depth="0" aria-hidden="true">
          <div className="rejoindre-hero-sky" />
        </div>

        {/* depth-1: atmosphere glow */}
        <div className="rejoindre-hero-layer rejoindre-depth-1" data-depth="1" aria-hidden="true">
          <div className="rejoindre-hero-glow rejoindre-hero-glow-a" />
          <div className="rejoindre-hero-glow rejoindre-hero-glow-b" />
        </div>

        {/* depth-2: flight path lines + gate marker */}
        <div className="rejoindre-hero-layer rejoindre-depth-2" data-depth="2" aria-hidden="true">
          <FlightPathDecor className="rejoindre-hero-paths" />
          <span className="rejoindre-gate-tag">{t.gate}</span>
        </div>

        {/* depth-3: the boarding pass — main object */}
        <div className="rejoindre-hero-layer rejoindre-depth-3" data-depth="3" aria-hidden="true">
          <div className="rejoindre-boarding-pass-wrap">
            <div className="rejoindre-boarding-pass">
              <div className="rejoindre-boarding-pass-top">
                <span className="rejoindre-boarding-label">{t.boardingLabel}</span>
                <span className="rejoindre-boarding-code">{t.flightCode}</span>
              </div>
              <div className="rejoindre-boarding-pass-body">
                <span className="rejoindre-boarding-seat">{t.seatInfo}</span>
                <span className="rejoindre-boarding-barcode" />
              </div>
              <div className="rejoindre-boarding-stamp">Embarquement confirmé</div>
            </div>
          </div>
          <AirplaneIcon className="rejoindre-hero-plane" ariaHidden />
        </div>

        {/* depth-4: headline + CTA — always visible at rest, never scroll-gated */}
        <div className="rejoindre-hero-layer rejoindre-depth-4" data-depth="4">
          <div className="rejoindre-container rejoindre-hero-content">
            <p className="landing-eyebrow landing-eyebrow-glass rejoindre-hero-eyebrow">
              <AirplaneIcon className="landing-kicker-plane" />
              {t.eyebrow}
            </p>
            <h1 className="rejoindre-hero-headline">{t.headline}</h1>
            <p className="rejoindre-hero-sub">{t.sub}</p>
            <div className="rejoindre-hero-ctas">
              <Link href="/register" className="landing-btn-glow landing-btn-lg">
                {t.ctaPrimary}
              </Link>
              <a href="#comment-ca-marche" className="landing-btn-outline-light landing-btn-lg">
                {t.ctaSecondary}
              </a>
            </div>
          </div>
        </div>

        {/* depth-5: foreground scroll hint */}
        <div className="rejoindre-hero-layer rejoindre-depth-5" data-depth="5" aria-hidden="true">
          <span className="rejoindre-scroll-hint">
            <span className="rejoindre-scroll-hint-chevron" />
            {t.scrollHint}
          </span>
        </div>
      </div>
    </section>
  );
}
