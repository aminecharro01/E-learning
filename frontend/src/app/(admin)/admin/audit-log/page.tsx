"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuditLog } from "@/lib/api";
import { AuditTimeline } from "@/components/admin/AuditTimeline";
import type { PageMeta } from "@/components/admin/DataTable";
import { useAuth } from "@/hooks/useAuth";
import type { AuditLogEntryItem } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/Skeleton";
import { btn } from "@/lib/ui";

const ACTION_LABEL: Record<string, string> = {
  USER_ROLE_CHANGED: "Rôle modifié",
  USER_ENABLED: "Compte activé",
  USER_DISABLED: "Compte suspendu",
  USER_BULK_ENABLED: "Comptes activés (lot)",
  USER_BULK_DISABLED: "Comptes suspendus (lot)",
  USER_PASSWORD_RESET: "Mot de passe réinitialisé",
};

type Row = AuditLogEntryItem & { id: string };

export default function AdminAuditLogPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLog(p, 20);
      setRows(data.content);
      setPageMeta({
        page: data.page,
        size: data.size,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de charger le journal d'audit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load(0);
  }, [isAdmin, load]);

  if (!isAdmin) {
    return <p className="text-sm text-muted">Réservé aux administrateurs.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Journal d&apos;audit</h1>
        <p className="mt-1 text-sm text-muted">Historique des actions sensibles (administration).</p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-theme p-10 text-center text-sm text-muted">
          Aucune action enregistrée.
        </p>
      ) : (
        <AuditTimeline entries={rows} actionLabel={(action) => ACTION_LABEL[action] ?? action} />
      )}

      {pageMeta && pageMeta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            className={btn.neutralSm}
            disabled={pageMeta.page <= 0}
            onClick={() => void load(pageMeta.page - 1)}
          >
            Précédent
          </button>
          <span className="text-xs text-muted">
            Page {pageMeta.page + 1} / {pageMeta.totalPages}
          </span>
          <button
            type="button"
            className={btn.neutralSm}
            disabled={pageMeta.page + 1 >= pageMeta.totalPages}
            onClick={() => void load(pageMeta.page + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
