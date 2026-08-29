"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { RejoindreReveal } from "./RejoindreReveal";

const ACCENT_WORDS = new Set(["stage,", "individuel", "réseau", "alumni"]);

const TAGLINE =
  "Ce n'est pas un diplôme de plus. C'est le stage, le suivi individuel et le réseau alumni qui transforment une formation en carrière.";

/**
 * The mandatory "tagline reveal" storytelling beat: one large statement,
 * words lighting up from muted to full ink in reading order as the section
 * crosses the viewport trigger line — a single IntersectionObserver on the
 * whole block, staggered per word via a CSS --word-delay custom property
 * (never a per-word observer, never an unthrottled scroll listener).
 */
export function TaglineReveal() {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.querySelectorAll(".rejoindre-tagline-word").forEach((word) => word.classList.add("is-lit"));
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll(".rejoindre-tagline-word").forEach((word) => word.classList.add("is-lit"));
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const words = TAGLINE.split(" ");

  return (
    <section className="rejoindre-section rejoindre-tagline" aria-label="Notre différence">
      <div className="rejoindre-container">
        <RejoindreReveal>
          <p className="rejoindre-tagline-text" ref={ref}>
            {words.map((word, index) => (
              <span
                key={`${word}-${index}`}
                className={`rejoindre-tagline-word${ACCENT_WORDS.has(word.toLowerCase()) ? " is-accent" : ""}`}
                style={{ "--word-delay": `${index * 35}ms` } as CSSProperties}
              >
                {word}{" "}
              </span>
            ))}
          </p>
        </RejoindreReveal>
      </div>
    </section>
  );
}
