"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuditLog } from "@/lib/api";
import { AuditTimeline } from "@/components/admin/AuditTimeline";
import type { PageMeta } from "@/components/admin/DataTable";
import { useAuth } from "@/hooks/useAuth";
import { AccessLocked } from "@/components/admin/ui/AccessLocked";
import type { AuditLogEntryItem } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/Skeleton";
import { btn, inputClass } from "@/lib/ui";

const ACTION_LABEL: Record<string, string> = {
  USER_ROLE_CHANGED: "Rôle modifié",
  USER_ENABLED: "Compte activé",
  USER_DISABLED: "Compte suspendu",
  USER_BULK_ENABLED: "Comptes activés (lot)",
  USER_BULK_DISABLED: "Comptes suspendus (lot)",
  USER_PASSWORD_RESET: "Mot de passe réinitialisé",
  GRADE_ADJUSTMENT_ADDED: "Bonus de note ajouté",
  GROUP_CREATED: "Groupe créé",
  GROUP_DELETED: "Groupe supprimé",
  GROUP_MEMBER_ADDED: "Apprenant ajouté au groupe",
  GROUP_MEMBER_REMOVED: "Apprenant retiré du groupe",
  GROUP_IMPORTED: "Groupe importé (fichier)",
  GROUP_CONTENT_ASSIGNED: "Contenu affecté au groupe",
  GROUP_CONTENT_REVOKED: "Contenu retiré du groupe",
};

type Row = AuditLogEntryItem & { id: string };

export default function AdminAuditLogPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(async (p: number, action: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLog(p, 20, action || undefined);
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
    void load(0, actionFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, actionFilter]);

  if (!isAdmin) {
    return <AccessLocked reason="Réservé aux administrateurs." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Journal d&apos;audit</h1>
          <p className="mt-1 text-sm text-muted">Historique des actions sensibles (administration).</p>
        </div>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-heading">Type d&apos;action</span>
          <select className={inputClass} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
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
            onClick={() => void load(pageMeta.page - 1, actionFilter)}
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
            onClick={() => void load(pageMeta.page + 1, actionFilter)}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
