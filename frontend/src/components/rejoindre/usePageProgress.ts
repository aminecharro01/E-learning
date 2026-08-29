"use client";

import { useEffect, useRef } from "react";

/**
 * Whole-document scroll progress (0 at top, 1 at bottom), rAF-throttled.
 * Distinct from useScrollProgress (which tracks one pinned element's own
 * height) — this one drives the top "flight progress" bar across the entire
 * page. Written directly onto the returned element's style, never onto
 * `window`/`document`, so it stays scoped to this page.
 */
export function usePageProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let ticking = false;

    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      el.style.setProperty("--page-progress", progress.toFixed(4));
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
