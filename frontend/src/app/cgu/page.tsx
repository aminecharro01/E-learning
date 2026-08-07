import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { cguIntro, cguMeta, cguSections } from "@/content/cgu";
import { iat } from "@/components/landing/content";
import "@/components/landing/landing.css";

const landingSans = Outfit({
  subsets: ["latin"],
  variable: "--font-landing-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${cguMeta.title} — ${iat.brand}`,
  description: `Conditions Générales d'Utilisation de la plateforme e-learning ${iat.brand}.`,
};

export default function CguPage() {
  return (
    <div className={landingSans.variable}>
      <LegalPageShell>
        <LegalDocument
          title={cguMeta.title}
          shortTitle={cguMeta.shortTitle}
          lastUpdated={cguMeta.lastUpdated}
          version={cguMeta.version}
          intro={cguIntro}
        >
          <nav className="legal-toc" aria-label="Sommaire des CGU">
            <h2>Sommaire</h2>
            <ol>
              {cguSections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          {cguSections.map((section) => (
            <LegalSection
              key={section.id}
              id={section.id}
              title={section.title}
              paragraphs={section.paragraphs}
              bullets={section.bullets}
            />
          ))}

          <p className="legal-footer-note">
            Retour à l&apos;{" "}
            <Link href="/">accueil</Link> ·{" "}
            <Link href="/register">créer un compte</Link> · Contact :{" "}
            <a href={iat.emailHref}>{iat.email}</a>
          </p>
        </LegalDocument>
      </LegalPageShell>
    </div>
  );
}
