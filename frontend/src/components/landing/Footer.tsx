import Link from "next/link";
import { iat } from "./content";

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <p className="landing-footer-copy">
          © {year} {iat.brand} — {iat.fullName}. Tous droits réservés.{" "}
          <Link href="/cgu">Conditions Générales d&apos;Utilisation</Link>
        </p>
      </div>
    </footer>
  );
}
