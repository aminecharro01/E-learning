"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { iat } from "./content";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";

export function LandingHeader() {
  const [sticky, setSticky] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY >= 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header
      className={`landing-header fixed top-0 z-40 w-full transition-[background-color,box-shadow,padding] duration-300 ${sticky ? "is-sticky" : "is-hero"}`}
    >
      <div className="landing-container flex items-center justify-between gap-4">
        <BrandLogo href="#home" size="lg" className="landing-brand shrink-0" />

        <nav className="landing-nav-pill hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {iat.nav.map((item) => (
            <a key={item.href} href={item.href} className="landing-nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggleButton className="landing-theme-toggle" />
          <Link href="/login" className="landing-btn-ghost-nav">
            Connexion
          </Link>
          <Link href="/register" className="landing-btn-glow landing-btn-sm">
            S&apos;inscrire
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggleButton className="landing-theme-toggle" />
          <button
            type="button"
            className="landing-menu-btn"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />
          <div
            id="landing-mobile-menu"
            className="landing-mobile-panel lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation principale"
          >
            <div className="mb-6 flex items-center justify-between">
              <BrandLogo href="#home" size="md" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full"
                aria-label="Fermer le menu"
              >
                <X size={22} aria-hidden />
              </button>
            </div>
            <nav className="flex flex-col gap-3">
              {iat.nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="landing-mobile-link"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Link href="/login" className="landing-btn-ghost text-center" onClick={() => setOpen(false)}>
                Connexion
              </Link>
              <Link href="/register" className="landing-btn-glow text-center" onClick={() => setOpen(false)}>
                S&apos;inscrire
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
