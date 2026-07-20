"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AirplaneIcon, FlightPathDecor } from "@/components/landing/icons/Airplane";
import { AirplaneCursor } from "@/components/landing/AirplaneCursor";
import { iat } from "@/components/landing/content";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRegister = pathname === "/register";

  return (
    <div className="auth-horizon">
      <AirplaneCursor />
      <div className="auth-shell">
        <div className="auth-shell-bg" aria-hidden />
        <FlightPathDecor className="auth-shell-paths" />

        <div className="auth-main">{children}</div>

        <aside className="auth-panel-side" aria-label="Informations IAT Academy">
          {isRegister ? (
            <div className="auth-panel-card auth-panel-card-register">
              <Link href="/" className="auth-panel-brand">
                <AirplaneIcon className="auth-panel-brand-plane" />
                <span className="auth-panel-brand-mark">IAT</span>
                <span className="auth-panel-brand-name">Academy</span>
              </Link>
              <p className="auth-panel-eyebrow">Réserver votre place</p>
              <p className="auth-panel-text">
                Rejoignez les apprenants en aviation, maritime et tourisme. 20 modules vous
                attendent.
              </p>
              <ul className="auth-panel-tracks">
                {iat.expertise.map((item) => (
                  <li key={item.id} className="auth-panel-track">
                    <span className="auth-panel-track-dot" aria-hidden />
                    <div>
                      <p className="auth-panel-track-title">{item.subtitle}</p>
                      <p className="auth-panel-track-desc">{item.title}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="auth-panel-card auth-panel-card-login">
              <div className="auth-panel-photo">
                <Image
                  src={iat.heroImage}
                  alt={iat.heroImageAlt}
                  fill
                  sizes="400px"
                  className="object-cover"
                />
                <div className="auth-panel-photo-overlay" />
              </div>
              <Link href="/" className="auth-panel-brand auth-panel-brand-over-photo">
                <AirplaneIcon className="auth-panel-brand-plane" />
                <span className="auth-panel-brand-mark">IAT</span>
                <span className="auth-panel-brand-name">Academy</span>
              </Link>
              <p className="auth-panel-eyebrow">Embarquement</p>
              <p className="auth-panel-text">Reprenez votre parcours là où vous vous êtes arrêté.</p>
              <ul className="auth-panel-chips">
                {iat.platformBenefits.map((item) => (
                  <li key={item} className="auth-panel-chip">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
