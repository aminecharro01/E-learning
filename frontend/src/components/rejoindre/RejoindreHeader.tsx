import Link from "next/link";
import { iat } from "../landing/content";
import { rejoindre } from "./content";
import { BrandLogo } from "@/components/brand/BrandLogo";

/**
 * Deliberately minimal — no multi-item nav. A dedicated conversion page
 * removes exit paths on purpose (CRO convention): logo for trust, phone for
 * reassurance, one repeated CTA. The full site nav lives on the institutional
 * homepage (components/landing/Header.tsx), not here.
 */
export function RejoindreHeader() {
  return (
    <header className="rejoindre-header">
      <div className="rejoindre-container rejoindre-header-row">
        <BrandLogo href="/" size="md" />
        <div className="rejoindre-header-actions">
          <a href={iat.phoneHref} className="rejoindre-header-phone">
            {iat.phone}
          </a>
          <Link href="/register" className="landing-btn-glow landing-btn-sm">
            {rejoindre.hero.ctaPrimary}
          </Link>
        </div>
      </div>
    </header>
  );
}
