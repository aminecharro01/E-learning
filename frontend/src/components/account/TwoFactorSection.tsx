"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { confirmTotp, disableTotp, enableTotp } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { btn, inputClass } from "@/lib/ui";

/** Shared between the learner and staff self-service profile pages — identical flow
 * for both, no role-specific behavior. */
export function TwoFactorSection() {
  const [secret, setSecret] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!secret) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(secret.otpauthUri, { width: 200, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [secret]);

  async function onEnable() {
    setBusy(true);
    setMsg(null);
    try {
      setSecret(await enableTotp());
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    setBusy(true);
    setMsg(null);
    try {
      await confirmTotp(code);
      setEnabled(true);
      setSecret(null);
      setCode("");
      setMsg("2FA activée.");
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : "Code invalide.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setBusy(true);
    setMsg(null);
    try {
      await disableTotp(code);
      setEnabled(false);
      setCode("");
      setMsg("2FA désactivée.");
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : "Code invalide.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-theme rounded-2xl p-6">
      <p className="text-sm font-semibold text-primary">Authentification à deux facteurs</p>
      <p className="mt-1 text-xs text-muted">
        Optionnelle — code à 6 chiffres depuis une application type Google Authenticator.
      </p>
      {msg && <p className="mt-2 text-xs">{msg}</p>}

      {!secret && !enabled && (
        <button type="button" className={`${btn.secondarySm} mt-3`} disabled={busy} onClick={() => void onEnable()}>
          Activer la 2FA
        </button>
      )}

      {secret && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-body">
            Scannez ce QR code avec votre application d&apos;authentification (Google Authenticator, Authy…).
          </p>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR code à scanner pour activer la 2FA"
              width={160}
              height={160}
              className="rounded-lg border border-theme"
            />
          )}
          <details className="text-xs text-muted">
            <summary className="cursor-pointer select-none">Impossible de scanner ? Saisir le code manuellement</summary>
            <p className="mt-1 text-body">
              Ajoutez ce secret dans votre application : <code className="text-heading">{secret.secret}</code>
            </p>
          </details>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Code à 6 chiffres"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button type="button" className={btn.primarySm} disabled={busy || code.length !== 6} onClick={() => void onConfirm()}>
              Confirmer
            </button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="mt-3 flex gap-2">
          <input
            className={inputClass}
            placeholder="Code à 6 chiffres pour désactiver"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <button type="button" className={btn.dangerSm} disabled={busy || code.length !== 6} onClick={() => void onDisable()}>
            Désactiver
          </button>
        </div>
      )}
    </section>
  );
}
