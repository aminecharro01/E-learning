import { iat } from "./content";

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <p className="landing-footer-copy">
          © {year} {iat.brand} — {iat.fullName}. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
