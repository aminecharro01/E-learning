"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuditLog } from "@/lib/api";
import { DataTable, type DataTableColumn, type PageMeta } from "@/components/admin/DataTable";
import { useAuth } from "@/hooks/useAuth";
import type { AuditLogEntryItem } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";

const ACTION_LABEL: Record<string, string> = {
  USER_ROLE_CHANGED: "Rôle modifié",
  USER_ENABLED: "Compte activé",
  USER_DISABLED: "Compte suspendu",
  USER_BULK_ENABLED: "Comptes activés (lot)",
  USER_BULK_DISABLED: "Comptes suspendus (lot)",
  USER_PASSWORD_RESET: "Mot de passe réinitialisé",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

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

  const columns: DataTableColumn<Row>[] = [
    { key: "date", header: "Date", render: (r) => formatDate(r.createdAt) },
    { key: "actor", header: "Acteur", render: (r) => r.actorName },
    { key: "action", header: "Action", render: (r) => ACTION_LABEL[r.action] ?? r.action },
    { key: "target", header: "Cible", render: (r) => r.targetType ?? "—" },
    { key: "metadata", header: "Détails", render: (r) => r.metadata ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Journal d&apos;audit</h1>
        <p className="mt-1 text-sm text-muted">Historique des actions sensibles (administration).</p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="Aucune action enregistrée."
        pageMeta={pageMeta}
        onPageChange={(p) => void load(p)}
      />
    </div>
  );
}
