"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AirplaneIcon } from "./icons/Airplane";

/** Persistent, fixed-position CTA — always reachable once the hero has scrolled past, on both desktop and mobile. */
export function LandingFloatingCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.75);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`landing-floating-cta ${visible ? "is-visible" : ""}`}>
      <Link href="/register" className="landing-floating-cta-btn">
        <AirplaneIcon className="h-4 w-4" ariaHidden />
        S&apos;inscrire au programme
      </Link>
    </div>
  );
}
