import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { LandingPage } from "@/components/landing/LandingPage";

const landingSans = Outfit({
  subsets: ["latin"],
  variable: "--font-landing-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IAT Academy — Formation Aviation, Maritime & Tourisme",
  description:
    "International Airlines & Tourism Academy. Formations PNC, agents d'escale, croisière et tourisme. Plateforme e-learning.",
};

export default function HomePage() {
  return (
    <div className={`landing-root ${landingSans.variable}`}>
      <LandingPage />
    </div>
  );
}
