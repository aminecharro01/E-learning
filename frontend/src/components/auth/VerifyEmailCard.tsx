"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { IconHome, IconPlane } from "@/components/brand/IatIcons";
import "./auth-boarding.css";

type Status = "loading" | "success" | "error";

export default function VerifyEmailCard() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(err instanceof ApiClientError ? err.message : "Serveur indisponible.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="iat-board auth-board">
      <div className="auth-board-bg" aria-hidden />

      <Link href="/" className="auth-board-home" aria-label="Retour à l'accueil">
        <IconHome size={20} />
      </Link>

      <section className="boarding-pass auth-pass" aria-label="Vérification de l'e-mail">
        <div className="bp-main">
          <span className="bp-eyebrow">
            <IconPlane size={14} />
            Vérification d&apos;e-mail
          </span>

          {status === "loading" && (
            <>
              <h1 className="bp-title">
                Vérification <span className="grad">en cours</span>
              </h1>
              <p className="bp-sub">Un instant, nous confirmons votre adresse e-mail…</p>
            </>
          )}

          {status === "success" && (
            <div className="auth-pass-success">
              <h1 className="bp-title">
                E-mail <span className="grad">vérifié</span>
              </h1>
              <p className="bp-sub">Votre adresse e-mail est confirmée. Vous pouvez vous connecter.</p>
              <Link href="/login" className="auth-pass-submit" style={{ display: "inline-flex" }}>
                Aller à la connexion
              </Link>
            </div>
          )}

          {status === "error" && (
            <>
              <h1 className="bp-title">
                Lien <span className="grad">invalide</span>
              </h1>
              <p className="bp-sub">
                {message ?? "Ce lien de vérification est incomplet, invalide ou expiré."}
              </p>
              <Link href="/login" className="auth-pass-submit" style={{ display: "inline-flex" }}>
                Retour à la connexion
              </Link>
            </>
          )}
        </div>

        <div className="bp-stub">
          <div className="bp-flight-code">IAT · VÉRIFICATION</div>
          <div className="bp-gate">
            <span>PORTE</span>
            EV
          </div>
          <div className="bp-barcode" aria-hidden />
        </div>
        <div className="bp-notch" aria-hidden />
      </section>
    </div>
  );
}
