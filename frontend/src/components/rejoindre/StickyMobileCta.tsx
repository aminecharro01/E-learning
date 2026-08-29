"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { rejoindre } from "./content";

/** Mobile-only sticky CTA bar — appears once the hero has scrolled past so it never duplicates the hero's own CTA on first paint. */
export function RejoindreStickyMobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`rejoindre-sticky-cta lg:hidden ${visible ? "is-visible" : ""}`}>
      <Link href="/register" className="landing-btn-glow rejoindre-sticky-cta-btn">
        {rejoindre.stickyMobile.label}
      </Link>
    </div>
  );
}
