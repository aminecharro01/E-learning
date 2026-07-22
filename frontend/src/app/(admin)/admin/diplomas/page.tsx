"use client";

import { useCallback, useEffect, useState } from "react";
import { listDiplomas, markDiplomaDelivered, downloadDiplomaPdf, type DiplomaReady } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ApiClientError } from "@/lib/api-client";
import { Badge } from "@/components/admin/ui/Badge";
import { btn } from "@/lib/ui";

export default function AdminDiplomasPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<DiplomaReady[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    return listDiplomas()
      .then(setItems)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Erreur."));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    reload().finally(() => setLoading(false));
  }, [isAdmin, reload]);

  if (!isAdmin) {
    return <p className="text-sm text-muted">Réservé à l&apos;administrateur.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Diplômes</p>
        <h1 className="mt-1 text-2xl font-bold text-heading">Remise physique à l&apos;école</h1>
        <p className="mt-2 text-sm text-muted">
          Un seul diplôme en fin de cycle. Marquez ici les remises physiques effectuées à
          l&apos;académie.
        </p>
      </div>

      {error && <p className="alert alert-warning">{error}</p>}
      {msg && <p className="alert alert-success">{msg}</p>}
      {loading && <div className="card-theme h-32 animate-pulse rounded-2xl bg-surface-2" />}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted">Aucun diplôme généré pour le moment.</p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.certificateId} className="card-theme rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{item.learnerName}</p>
                <p className="text-sm text-muted">{item.email}</p>
                <p className="mt-1 text-xs text-muted">
                  Code {item.verificationCode} · émis le{" "}
                  {new Intl.DateTimeFormat("fr-FR").format(new Date(item.issuedAt))}
                </p>
              </div>
              <Badge color={item.physicallyDelivered ? "success" : "warning"} size="sm">
                {item.physicallyDelivered ? "Remis" : "À remettre"}
              </Badge>
            </div>
            {isAdmin && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btn.secondarySm}
                  onClick={() => {
                    void downloadDiplomaPdf(item.certificateId)
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `diplome-${item.verificationCode}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      })
                      .catch((err) =>
                        setError(err instanceof ApiClientError ? err.message : "Téléchargement impossible.")
                      );
                  }}
                >
                  PDF école
                </button>
                {!item.physicallyDelivered ? (
                  <button
                    type="button"
                    className={btn.successSm}
                    onClick={() => {
                      void markDiplomaDelivered(item.certificateId, true, "Remis à l'école")
                        .then(() => {
                          setMsg(`Diplôme remis : ${item.learnerName}`);
                          return reload();
                        })
                        .catch((err) =>
                          setError(err instanceof ApiClientError ? err.message : "Erreur.")
                        );
                    }}
                  >
                    Marquer remis physiquement
                  </button>
                ) : (
                  <button
                    type="button"
                    className={btn.secondarySm}
                    onClick={() => {
                      void markDiplomaDelivered(item.certificateId, false)
                        .then(() => {
                          setMsg("Statut remis annulé.");
                          return reload();
                        })
                        .catch((err) =>
                          setError(err instanceof ApiClientError ? err.message : "Erreur.")
                        );
                    }}
                  >
                    Annuler remise
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
