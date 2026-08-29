"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type Props = { children: ReactNode; className?: string; delayMs?: number };

/**
 * This page's own scroll reveal — same IntersectionObserver pattern as
 * components/landing/Reveal.tsx, but a heavier "gentle mass" motion (blur +
 * rise + fade, longer duration, fluid easing) for the storytelling feel this
 * page wants. Kept separate from the shared Reveal so the institutional
 * homepage's motion is never affected by this page's changes.
 */
export function RejoindreReveal({ children, className = "", delayMs = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`rejoindre-reveal ${className}`} style={{ "--delay": `${delayMs}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
