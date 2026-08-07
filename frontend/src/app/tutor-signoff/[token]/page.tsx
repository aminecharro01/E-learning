"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSignoffInvite, signOffStage } from "@/lib/api";
import type { SignoffInviteView } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { btn, inputClass } from "@/lib/ui";

export default function TutorSignoffPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [invite, setInvite] = useState<SignoffInviteView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    getSignoffInvite(token)
      .then(setInvite)
      .catch((err) =>
        setLoadError(err instanceof ApiClientError ? err.message : "Ce lien est invalide.")
      );
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signOffStage(token, note.trim() || undefined);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="card-theme w-full max-w-md rounded-2xl p-6">
        <BrandLogo size="md" />
        <h1 className="mt-4 text-xl font-bold text-heading">Validation de stage</h1>

        {loadError && <p className="alert alert-error mt-4">{loadError}</p>}

        {invite && !done && (
          <>
            <p className="mt-3 text-sm text-body">
              Vous êtes invité(e) à valider l&apos;unité <strong>{invite.ufCode}</strong> de{" "}
              <strong>{invite.learnerName}</strong>.
            </p>
            {invite.alreadyValidated && (
              <p className="alert alert-info mt-3">
                Cette unité est déjà marquée comme validée — vous pouvez tout de même confirmer.
              </p>
            )}
            {error && <p className="alert alert-warning mt-3">{error}</p>}

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="tutor-note" className="text-sm text-muted">
                  Commentaire (optionnel)
                </label>
                <textarea
                  id="tutor-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <button type="submit" disabled={busy} className={`${btn.primary} w-full justify-center`}>
                {busy ? "Envoi…" : "Valider ce stage"}
              </button>
            </form>
          </>
        )}

        {done && <p className="alert alert-success mt-4">Validation enregistrée. Merci !</p>}
      </div>
    </main>
  );
}
