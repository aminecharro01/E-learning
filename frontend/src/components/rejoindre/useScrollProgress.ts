"use client";

import { useEffect, useRef } from "react";

/**
 * Drives a `--progress` CSS custom property (0 → 1) off how far the user has
 * scrolled through the element's own height, rAF-throttled. Used for the one
 * cinematic hero moment (boarding-pass → departure) instead of pulling in a
 * scroll-animation library — every consumer is a plain CSS transform/opacity
 * rule keyed off var(--progress).
 *
 * Respects prefers-reduced-motion: skips the listener entirely and pins the
 * end-state progress value so the hero renders fully "departed", static.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--progress", "1");
      return;
    }

    let ticking = false;

    const update = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const raw = total > 0 ? -rect.top / total : 0;
      const progress = Math.min(1, Math.max(0, raw));
      el.style.setProperty("--progress", progress.toFixed(4));
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return ref;
}
