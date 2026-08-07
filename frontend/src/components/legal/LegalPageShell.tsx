"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { iat } from "@/components/landing/content";
import "./legal.css";

export function LegalPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="legal-page landing-root">
      <header className="legal-topbar">
        <Link href="/" className="legal-topbar-brand" aria-label="Retour à l'accueil">
          <BrandLogo href={null} size="sm" />
          <span>{iat.brand}</span>
        </Link>
        <div className="legal-topbar-actions">
          <ThemeToggleButton />
          <Link href="/register" className="legal-topbar-link">
            Inscription
          </Link>
          <Link href="/login" className="legal-topbar-link">
            Connexion
          </Link>
        </div>
      </header>
      <main className="legal-shell">{children}</main>
    </div>
  );
}
