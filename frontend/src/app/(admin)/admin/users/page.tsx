"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listUsersPaged,
  setUserEnabled,
  updateUserRole,
  unlockModuleForUser,
  getMyProgress,
  resetUserPassword,
} from "@/lib/api";
import { DataTable, type DataTableColumn, type PageMeta } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/admin/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import type { Module, Role, User } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ user: User; enabled: boolean } | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [unlock, setUnlock] = useState<{ userId: string; moduleId: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (p: number, q: string) => {
    const [u, prog] = await Promise.all([
      listUsersPaged(p, 10, q || undefined),
      getMyProgress(),
    ]);
    setUsers(u.content);
    setPageMeta({
      page: u.page,
      size: u.size,
      totalElements: u.totalElements,
      totalPages: u.totalPages,
    });
    setModules(prog.modules);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    reload(0, "")
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Erreur."))
      .finally(() => setLoading(false));
  }, [isAdmin, reload]);

  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
      void reload(0, search.trim()).catch((err) =>
        setError(err instanceof ApiClientError ? err.message : "Erreur.")
      );
    }, 300);
    return () => clearTimeout(t);
  }, [search, isAdmin, reload]);

  if (!isAdmin) {
    return <p className="text-sm text-muted">Réservé aux administrateurs.</p>;
  }

  const columns: DataTableColumn<User>[] = [
    { key: "name", header: "Nom", render: (u) => u.fullName || "—" },
    { key: "email", header: "Email", render: (u) => u.email },
    {
      key: "role",
      header: "Rôle",
      render: (u) => (
        <select
          value={u.role}
          className="select-theme"
          onChange={(e) => {
            void updateUserRole(u.id, e.target.value as Role)
              .then(() => reload(page, query))
              .catch((err) =>
                setError(err instanceof ApiClientError ? err.message : "Erreur rôle.")
              );
          }}
        >
          <option value="ETUDIANT">ETUDIANT</option>
          <option value="FORMATEUR">FORMATEUR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      ),
    },
    {
      key: "status",
      header: "Compte",
      render: (u) => (
        <Badge color={u.enabled !== false ? "success" : "error"} size="sm">
          {u.enabled !== false ? "Actif" : "Suspendu"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={u.enabled === false ? btn.successXs : btn.dangerXs}
            onClick={() => setConfirm({ user: u, enabled: u.enabled === false })}
          >
            {u.enabled === false ? "Activer" : "Suspendre"}
          </button>
          <button
            type="button"
            className={btn.warningXs}
            onClick={() => {
              setResetResult(null);
              setResetTarget(u);
            }}
          >
            Reset MDP
          </button>
        </div>
      ),
    },
    {
      key: "unlock",
      header: "Déblocage module",
      render: (u) =>
        u.role === "ETUDIANT" ? (
          <select
            defaultValue=""
            className="select-theme"
            onChange={(e) => {
              if (!e.target.value) return;
              setUnlock({ userId: u.id, moduleId: e.target.value });
              e.target.value = "";
            }}
          >
            <option value="">Choisir…</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted">
          Rôles, suspension / activation, reset mot de passe (ADMIN)
        </p>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      {msg && <p className="alert alert-success">{msg}</p>}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher…"
        pageMeta={pageMeta}
        onPageChange={(p) => {
          setPage(p);
          void reload(p, query);
        }}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.enabled ? "Activer le compte ?" : "Suspendre le compte ?"}
        description={
          confirm?.enabled
            ? `Le compte ${confirm?.user.email} pourra à nouveau se connecter.`
            : `Le compte ${confirm?.user.email} ne pourra plus se connecter.`
        }
        danger={!confirm?.enabled}
        busy={busy}
        confirmLabel={confirm?.enabled ? "Activer" : "Suspendre"}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          setBusy(true);
          setError(null);
          void setUserEnabled(confirm.user.id, confirm.enabled)
            .then(() => reload(page, query))
            .then(() => {
              setConfirm(null);
              setMsg(
                confirm.enabled
                  ? `Compte ${confirm.user.email} activé.`
                  : `Compte ${confirm.user.email} suspendu.`
              );
            })
            .catch((err) => setError(err instanceof ApiClientError ? err.message : "Erreur."))
            .finally(() => setBusy(false));
        }}
      />

      <ConfirmDialog
        open={!!resetTarget}
        title="Réinitialiser le mot de passe ?"
        description={`Le mot de passe de ${resetTarget?.email} sera remplacé par le mot de passe temporaire défini dans Paramètres → Application.`}
        busy={busy}
        confirmLabel="Réinitialiser"
        onClose={() => {
          setResetTarget(null);
          setResetResult(null);
        }}
        onConfirm={() => {
          if (!resetTarget) return;
          setBusy(true);
          setError(null);
          void resetUserPassword(resetTarget.id)
            .then((res) => {
              setResetResult(res.temporaryPassword);
              setMsg(res.message);
              setResetTarget(null);
            })
            .catch((err) => setError(err instanceof ApiClientError ? err.message : "Erreur."))
            .finally(() => setBusy(false));
        }}
      />

      {resetResult && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Mot de passe temporaire à communiquer à l&apos;utilisateur :{" "}
          <code className="rounded bg-surface-2 px-2 py-0.5 font-mono text-body">
            {resetResult}
          </code>
          <button
            type="button"
            className="ml-3 text-xs underline"
            onClick={() => setResetResult(null)}
          >
            Fermer
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!unlock}
        title="Débloquer le module manuellement ?"
        description="Toutes les sections du module seront marquées comme terminées pour cet apprenant."
        busy={busy}
        confirmLabel="Débloquer"
        onClose={() => setUnlock(null)}
        onConfirm={() => {
          if (!unlock) return;
          setBusy(true);
          void unlockModuleForUser(unlock.userId, unlock.moduleId)
            .then(() => {
              setUnlock(null);
              setMsg("Module débloqué.");
            })
            .catch((err) => setError(err instanceof ApiClientError ? err.message : "Erreur."))
            .finally(() => setBusy(false));
        }}
      />
    </div>
  );
}
