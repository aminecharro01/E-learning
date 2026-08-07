"use client";

import { useCallback, useEffect, useState } from "react";
import {
  bulkSetUsersEnabled,
  listUsersPaged,
  setUserEnabled,
  setUserYear2Access,
  openYear2ForAll,
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
  const { isAdmin, isSuperAdmin } = useAuth();
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
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onBulkSetEnabled(enabled: boolean) {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await bulkSetUsersEnabled(Array.from(selected), enabled);
      setMsg(res.message);
      setSelected(new Set());
      await reload(page, query);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

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
    {
      key: "select",
      header: "",
      render: (u) => (
        <input
          type="checkbox"
          checked={selected.has(u.id)}
          onChange={() => toggleSelected(u.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Sélectionner ${u.email}`}
        />
      ),
    },
    { key: "name", header: "Nom", render: (u) => u.fullName || "—" },
    { key: "email", header: "Courriel", render: (u) => u.email },
    {
      key: "role",
      header: "Rôle",
      render: (u) => (
        <select
          value={u.role}
          className="select-theme"
          disabled={!isSuperAdmin && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")}
          onChange={(e) => {
            void updateUserRole(u.id, e.target.value as Role)
              .then(() => reload(page, query))
              .catch((err) =>
                setError(err instanceof ApiClientError ? err.message : "Erreur rôle.")
              );
          }}
        >
          <option value="ETUDIANT">Étudiant</option>
          <option value="FORMATEUR">Formateur</option>
          {(isSuperAdmin || u.role === "ADMIN") && <option value="ADMIN">Directeur</option>}
          {(isSuperAdmin || u.role === "SUPER_ADMIN") && (
            <option value="SUPER_ADMIN">Super Admin</option>
          )}
        </select>
      ),
    },
    {
      key: "status",
      header: "Compte",
      render: (u) => (
        <div className="flex flex-col gap-1">
          <Badge color={u.enabled !== false ? "success" : "error"} size="sm">
            {u.enabled !== false ? "Actif" : "En attente / suspendu"}
          </Badge>
          {u.role === "ETUDIANT" && (
            <Badge color={u.year2AccessEnabled ? "success" : "light"} size="sm">
              {u.year2AccessEnabled ? "Année 2 ouverte" : "Année 1"}
            </Badge>
          )}
        </div>
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
          {u.role === "ETUDIANT" && (
            <button
              type="button"
              className={btn.secondaryXs}
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void setUserYear2Access(u.id, !u.year2AccessEnabled)
                  .then(() => reload(page, query))
                  .then(() =>
                    setMsg(
                      u.year2AccessEnabled
                        ? `Année 2 fermée pour ${u.email}`
                        : `Année 2 ouverte pour ${u.email}`
                    )
                  )
                  .catch((err) =>
                    setError(err instanceof ApiClientError ? err.message : "Erreur année 2.")
                  )
                  .finally(() => setBusy(false));
              }}
            >
              {u.year2AccessEnabled ? "Fermer A2" : "Ouvrir A2"}
            </button>
          )}
          <button
            type="button"
            className={btn.warningXs}
            onClick={() => {
              setResetResult(null);
              setResetTarget(u);
            }}
          >
            Réinit. MDP
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Utilisateurs</h1>
          <p className="mt-1 text-sm text-muted">
            Activation compte, ouverture année 2, rôles, reset mot de passe (ADMIN)
          </p>
        </div>
        <button
          type="button"
          className={btn.primarySm}
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void openYear2ForAll()
              .then((res) => {
                setMsg(res.message);
                return reload(page, query);
              })
              .catch((err) =>
                setError(err instanceof ApiClientError ? err.message : "Erreur ouverture A2.")
              )
              .finally(() => setBusy(false));
          }}
        >
          Ouvrir année 2 (tous actifs)
        </button>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      {msg && <p className="alert alert-success">{msg}</p>}

      {selected.size > 0 && (
        <div className="card-theme flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
          <span className="text-sm text-heading">{selected.size} sélectionné(s)</span>
          <button type="button" className={btn.successXs} disabled={busy} onClick={() => void onBulkSetEnabled(true)}>
            Activer
          </button>
          <button type="button" className={btn.dangerXs} disabled={busy} onClick={() => void onBulkSetEnabled(false)}>
            Suspendre
          </button>
          <button type="button" className={btn.neutralXs} onClick={() => setSelected(new Set())}>
            Désélectionner
          </button>
        </div>
      )}

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
