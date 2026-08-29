"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addGroupMember,
  assignGroupContent,
  createGroup,
  deleteGroup,
  getGroupLeaderboard,
  getMyProgress,
  importGroup,
  listGroupAssignments,
  listGroupMembers,
  listGroups,
  listUsersPaged,
  removeGroupMember,
  revokeGroupAssignment,
} from "@/lib/api";
import type {
  GroupAssignment,
  GroupImportResult,
  GroupMember,
  LearnerGroup,
  Module,
  User,
} from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { AccessLocked } from "@/components/admin/ui/AccessLocked";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/toast-store";
import { btn, inputClass } from "@/lib/ui";

function CollapseToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={btn.neutralXs}
      aria-expanded={open}
      onClick={onToggle}
    >
      {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
      {open ? "Réduire" : "Ouvrir"}
    </button>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function AdminGroupsPage() {
  const { isAdmin } = useAuth();

  const [groups, setGroups] = useState<LearnerGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [assignments, setAssignments] = useState<GroupAssignment[]>([]);
  const [leaderboard, setLeaderboard] = useState<
    { rank: number; userId: string; fullName: string; averageScore: number }[]
  >([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<GroupMember | null>(null);
  const [confirmRevokeAssignment, setConfirmRevokeAssignment] = useState<GroupAssignment | null>(null);

  // Create/Import stay collapsed by default so the groups list is visible without
  // scrolling past two big forms first (the top complaint about this page's layout).
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");

  // Création / import
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newMode, setNewMode] = useState<"EN_LIGNE" | "HYBRIDE">("HYBRIDE");
  const [importName, setImportName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<GroupImportResult | null>(null);

  // Ajout d'un apprenant existant
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<User[]>([]);

  // Affectation de contenu
  const [targetType, setTargetType] = useState<"MODULE" | "UF">("MODULE");
  const [moduleId, setModuleId] = useState("");
  const [ufCode, setUfCode] = useState("");
  const [unlockAt, setUnlockAt] = useState("");

  const selected = useMemo(
    () => groups.find((g) => g.id === selectedId) ?? null,
    [groups, selectedId]
  );

  const ufCodes = useMemo(() => {
    const seen = new Map<string, string>();
    modules.forEach((m) => {
      if (m.ufCode && !seen.has(m.ufCode)) {
        seen.set(m.ufCode, m.ufTitle ?? m.ufCode);
      }
    });
    return Array.from(seen.entries());
  }, [modules]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) => g.name.toLowerCase().includes(q) || (g.code ?? "").toLowerCase().includes(q)
    );
  }, [groups, groupSearch]);

  const reloadGroups = useCallback(async () => {
    const list = await listGroups();
    setGroups(list);
    return list;
  }, []);

  const reloadDetail = useCallback(async (groupId: string) => {
    setDetailLoading(true);
    try {
      const [m, a] = await Promise.all([
        listGroupMembers(groupId),
        listGroupAssignments(groupId),
      ]);
      setMembers(m);
      setAssignments(a);
    } finally {
      setDetailLoading(false);
    }
    getGroupLeaderboard(groupId)
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([reloadGroups(), getMyProgress()])
      .then(([, progress]) => setModules(progress.modules))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger les groupes."))
      .finally(() => setLoading(false));
  }, [isAdmin, reloadGroups]);

  useEffect(() => {
    if (!selectedId) {
      setMembers([]);
      setAssignments([]);
      setLeaderboard([]);
      return;
    }
    void reloadDetail(selectedId).catch((err) =>
      setError(err instanceof ApiClientError ? err.message : "Impossible de charger le détail du groupe.")
    );
  }, [selectedId, reloadDetail]);

  // Recherche d'apprenants à rattacher (débouncée)
  useEffect(() => {
    if (!selectedId || search.trim().length < 2) {
      setCandidates([]);
      return;
    }
    const t = setTimeout(() => {
      listUsersPaged(0, 8, search.trim())
        .then((res) => setCandidates(res.content.filter((u) => u.role === "ETUDIANT")))
        .catch(() => setCandidates([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search, selectedId]);

  if (!isAdmin) {
    return <AccessLocked reason="Réservé aux administrateurs." />;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Opération impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Groupes (présentiel / hybride)</h1>
        <p className="mt-1 text-sm text-muted">
          Constituez une promo, importez ses apprenants et programmez le contenu accessible.
          Les apprenants d&apos;un groupe n&apos;ont aucun déblocage automatique : ils accèdent
          uniquement à ce que vous leur affectez ici.
        </p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ---------------------------------------------- Colonne gauche */}
        <div className="space-y-4">
          <ComponentCard
            title="Créer un groupe"
            desc="Groupe vide — vous y ajouterez des apprenants existants"
            action={<CollapseToggle open={createOpen} onToggle={() => setCreateOpen((v) => !v)} />}
          >
            {createOpen && (
            <div className="space-y-2">
              <input
                className={inputClass}
                placeholder="Promo 2026 — Groupe A"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inputClass}
                  placeholder="Code (ex. 2026-A)"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
                <select
                  className={inputClass}
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as "EN_LIGNE" | "HYBRIDE")}
                >
                  <option value="HYBRIDE">Hybride</option>
                  <option value="EN_LIGNE">En ligne</option>
                </select>
                <input
                  type="date"
                  className={inputClass}
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
                <input
                  type="date"
                  className={inputClass}
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </div>
              <button
                type="button"
                disabled={busy || !newName.trim()}
                className={`${btn.primarySm} w-full`}
                onClick={() =>
                  void run(async () => {
                    const created = await createGroup(newName.trim(), {
                      code: newCode.trim() || undefined,
                      startDate: newStartDate || undefined,
                      endDate: newEndDate || undefined,
                      enrollmentMode: newMode,
                    });
                    setNewName("");
                    setNewCode("");
                    setNewStartDate("");
                    setNewEndDate("");
                    await reloadGroups();
                    setSelectedId(created.id);
                    setCreateOpen(false);
                    toast.success("Groupe créé.");
                  })
                }
              >
                Créer
              </button>
            </div>
            )}
          </ComponentCard>

          <ComponentCard
            title="Importer un groupe (Excel)"
            desc="Colonnes : Nom complet | CIN/Matricule | Téléphone (avec ligne d'en-tête)"
            action={<CollapseToggle open={importOpen} onToggle={() => setImportOpen((v) => !v)} />}
          >
            {importOpen && (
            <div className="space-y-2">
              <input
                className={inputClass}
                placeholder="Nom du groupe"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
              />
              <input
                type="file"
                accept=".xlsx"
                className={inputClass}
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={busy || !importName.trim() || !importFile}
                className={`${btn.primarySm} w-full`}
                onClick={() =>
                  void run(async () => {
                    const res = await importGroup(importName.trim(), importFile!);
                    setImportResult(res);
                    setImportName("");
                    setImportFile(null);
                    await reloadGroups();
                    setSelectedId(res.groupId);
                    toast.success(`${res.importedCount} compte(s) créé(s).`);
                  })
                }
              >
                {busy ? "Import…" : "Importer"}
              </button>
            </div>
            )}

            {importResult && (
              <div className="mt-3 space-y-2 text-xs">
                <p className="alert alert-success">
                  {importResult.importedCount} compte(s) créé(s) dans « {importResult.groupName} ».
                  Mot de passe initial : <strong>{importResult.defaultPassword}</strong> — les
                  apprenants se connectent avec leur CIN/matricule puis complètent leur profil.
                </p>
                {importResult.errors.length > 0 && (
                  <div className="alert alert-warning">
                    <p className="font-semibold">{importResult.errors.length} ligne(s) ignorée(s) :</p>
                    <ul className="mt-1 list-disc pl-4">
                      {importResult.errors.map((e) => (
                        <li key={e.rowNumber}>
                          Ligne {e.rowNumber} — {e.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </ComponentCard>

          <ComponentCard title="Groupes" desc={`${groups.length} groupe(s)`}>
            {groups.length > 3 && (
              <input
                className={`${inputClass} mb-3`}
                placeholder="Rechercher un groupe (nom ou code)…"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
              />
            )}
            {loading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted">Aucun groupe pour le moment.</p>
            ) : filteredGroups.length === 0 ? (
              <p className="text-sm text-muted">Aucun groupe ne correspond à « {groupSearch} ».</p>
            ) : (
              <ul className="space-y-2">
                {filteredGroups.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(g.id)}
                      className={`w-full rounded-xl border border-theme px-3 py-2 text-left text-sm ${
                        g.id === selectedId ? "bg-surface-2 ring-2 ring-[var(--ring)]" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-heading">{g.name}</span>
                        {g.code && <span className="badge-inline badge-navy shrink-0">{g.code}</span>}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <span className={`badge-inline ${g.enrollmentMode === "EN_LIGNE" ? "badge-success" : "badge-gold"}`}>
                          {g.enrollmentMode === "EN_LIGNE" ? "En ligne" : "Hybride"}
                        </span>
                        <span>{g.memberCount} apprenant(s)</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ComponentCard>
        </div>

        {/* ---------------------------------------------- Colonne droite */}
        <div className="space-y-4">
          {!selected ? (
            <ComponentCard title="Détail du groupe" desc="Sélectionnez un groupe à gauche">
              <p className="text-sm text-muted">Aucun groupe sélectionné.</p>
            </ComponentCard>
          ) : (
            <>
              <ComponentCard
                title={selected.code ? `${selected.name} (${selected.code})` : selected.name}
                desc=""
                action={
                  <button
                    type="button"
                    className={btn.dangerSm}
                    disabled={busy}
                    onClick={() => setConfirmDeleteGroup(true)}
                  >
                    Supprimer le groupe
                  </button>
                }
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`badge-inline ${selected.enrollmentMode === "EN_LIGNE" ? "badge-success" : "badge-gold"}`}>
                    {selected.enrollmentMode === "EN_LIGNE" ? "En ligne" : "Hybride"}
                  </span>
                  <span className="badge-inline badge-navy">{members.length} apprenant(s)</span>
                  <span className="badge-inline badge-navy">{assignments.length} contenu(s) affecté(s)</span>
                  {selected.startDate && (
                    <span className="text-muted">Du {formatDateTime(selected.startDate)}</span>
                  )}
                  {selected.endDate && <span className="text-muted">au {formatDateTime(selected.endDate)}</span>}
                </div>
              </ComponentCard>

              <ComponentCard
                title="Programmer du contenu"
                desc="Ouvrir un module ou une UF entière, immédiatement ou à une date future"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-heading">
                    Type
                    <select
                      className={`${inputClass} mt-1`}
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as "MODULE" | "UF")}
                    >
                      <option value="MODULE">Un module</option>
                      <option value="UF">Une unité de formation</option>
                    </select>
                  </label>

                  {targetType === "MODULE" ? (
                    <label className="block text-sm font-medium text-heading">
                      Module
                      <select
                        className={`${inputClass} mt-1`}
                        value={moduleId}
                        onChange={(e) => setModuleId(e.target.value)}
                      >
                        <option value="">Choisir…</option>
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="block text-sm font-medium text-heading">
                      Unité de formation
                      <select
                        className={`${inputClass} mt-1`}
                        value={ufCode}
                        onChange={(e) => setUfCode(e.target.value)}
                      >
                        <option value="">Choisir…</option>
                        {ufCodes.map(([code, title]) => (
                          <option key={code} value={code}>
                            {code} — {title}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="block text-sm font-medium text-heading sm:col-span-2">
                    Ouverture
                    <input
                      type="datetime-local"
                      className={`${inputClass} mt-1`}
                      value={unlockAt}
                      onChange={(e) => setUnlockAt(e.target.value)}
                    />
                    <span className="mt-1 block text-xs font-normal text-muted">
                      Laisser vide pour une ouverture immédiate.
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  className={`${btn.primarySm} mt-3`}
                  disabled={
                    busy ||
                    (targetType === "MODULE" ? !moduleId : !ufCode)
                  }
                  onClick={() =>
                    void run(async () => {
                      const next = await assignGroupContent(selected.id, {
                        targetType,
                        moduleId: targetType === "MODULE" ? moduleId : undefined,
                        ufCode: targetType === "UF" ? ufCode : undefined,
                        unlockAt: unlockAt ? new Date(unlockAt).toISOString() : null,
                      });
                      setAssignments(next);
                      setModuleId("");
                      setUfCode("");
                      setUnlockAt("");
                      toast.success("Contenu programmé.");
                    })
                  }
                >
                  Programmer
                </button>

                <div className="mt-4">
                  {detailLoading ? (
                    <Skeleton className="h-20 rounded-xl" />
                  ) : assignments.length === 0 ? (
                    <p className="text-sm text-muted">Aucun contenu affecté — tout est verrouillé.</p>
                  ) : (
                    <ul className="space-y-2">
                      {assignments.map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-theme px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium text-heading">{a.moduleTitle}</p>
                            <p className="text-xs text-muted">
                              {a.ufCode ? `${a.ufCode} · ` : ""}
                              {a.unlocked
                                ? a.unlockAt
                                  ? `Ouvert depuis le ${formatDateTime(a.unlockAt)}`
                                  : "Ouvert (immédiat)"
                                : `Programmé pour le ${formatDateTime(a.unlockAt)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`badge-inline ${a.unlocked ? "badge-success" : "badge-gold"}`}
                            >
                              {a.unlocked ? "Ouvert" : "Programmé"}
                            </span>
                            <button
                              type="button"
                              className={btn.dangerXs}
                              disabled={busy}
                              onClick={() => setConfirmRevokeAssignment(a)}
                            >
                              Retirer
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </ComponentCard>

              {leaderboard.length > 0 && (
                <ComponentCard title="Classement" desc="Score moyen des évaluations passées">
                  <ul className="space-y-1.5">
                    {leaderboard.map((entry) => (
                      <li
                        key={entry.userId}
                        className="flex items-center justify-between rounded-lg border border-theme px-3 py-1.5 text-sm"
                      >
                        <span>
                          <span className="mr-2 font-mono text-xs text-muted">#{entry.rank}</span>
                          {entry.fullName}
                        </span>
                        <span className="font-semibold text-heading">{entry.averageScore}%</span>
                      </li>
                    ))}
                  </ul>
                </ComponentCard>
              )}

              <ComponentCard
                title="Apprenants du groupe"
                desc="Ajoutez un compte existant, ou utilisez l'import Excel pour créer de nouveaux comptes"
              >
                <div className="space-y-2">
                  <input
                    className={inputClass}
                    placeholder="Rechercher un apprenant existant (nom ou courriel)…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {candidates.length > 0 && (
                    <ul className="space-y-1">
                      {candidates.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-theme px-3 py-2 text-sm"
                        >
                          <span>
                            {c.fullName || c.email}
                            {c.groupName && (
                              <span className="ml-2 text-xs text-muted">
                                (actuellement dans « {c.groupName} »)
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            className={btn.secondaryXs}
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await addGroupMember(selected.id, c.id);
                                setSearch("");
                                setCandidates([]);
                                await Promise.all([reloadGroups(), reloadDetail(selected.id)]);
                                toast.success("Apprenant ajouté au groupe.");
                              })
                            }
                          >
                            Ajouter
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-4">
                  {detailLoading ? (
                    <Skeleton className="h-24 rounded-xl" />
                  ) : members.length === 0 ? (
                    <p className="text-sm text-muted">Aucun apprenant dans ce groupe.</p>
                  ) : (
                    <ul className="space-y-2">
                      {members.map((m) => (
                        <li
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-theme px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium text-heading">{m.fullName || "—"}</p>
                            <p className="text-xs text-muted">
                              {m.matricule ? `Matricule ${m.matricule}` : ""}
                              {m.email ? ` · ${m.email}` : ""}
                              {!m.profileCompleted && " · profil à compléter"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!m.profileCompleted && (
                              <span className="badge-inline badge-gold">1ʳᵉ connexion</span>
                            )}
                            <button
                              type="button"
                              className={btn.dangerXs}
                              disabled={busy}
                              onClick={() => setConfirmRemoveMember(m)}
                            >
                              Retirer
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </ComponentCard>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteGroup}
        title="Supprimer ce groupe ?"
        description={`Le groupe « ${selected?.name ?? ""} » sera supprimé et ses apprenants redeviendront 100 % en ligne.`}
        danger
        busy={busy}
        confirmLabel="Supprimer"
        onClose={() => setConfirmDeleteGroup(false)}
        onConfirm={() =>
          void run(async () => {
            if (!selected) return;
            await deleteGroup(selected.id);
            setSelectedId(null);
            await reloadGroups();
            toast.success("Groupe supprimé. Les apprenants redeviennent 100 % en ligne.");
            setConfirmDeleteGroup(false);
          })
        }
      />

      <ConfirmDialog
        open={!!confirmRemoveMember}
        title="Retirer cet apprenant du groupe ?"
        description={`« ${confirmRemoveMember?.fullName || confirmRemoveMember?.email || ""} » redeviendra 100 % en ligne et perdra l'accès au contenu programmé ici.`}
        danger
        busy={busy}
        confirmLabel="Retirer"
        onClose={() => setConfirmRemoveMember(null)}
        onConfirm={() =>
          void run(async () => {
            if (!selected || !confirmRemoveMember) return;
            await removeGroupMember(selected.id, confirmRemoveMember.id);
            await Promise.all([reloadGroups(), reloadDetail(selected.id)]);
            toast.success("Apprenant retiré du groupe.");
            setConfirmRemoveMember(null);
          })
        }
      />

      <ConfirmDialog
        open={!!confirmRevokeAssignment}
        title="Retirer cette affectation de contenu ?"
        description={`« ${confirmRevokeAssignment?.moduleTitle ?? ""} » redeviendra verrouillé pour ce groupe.`}
        danger
        busy={busy}
        confirmLabel="Retirer"
        onClose={() => setConfirmRevokeAssignment(null)}
        onConfirm={() =>
          void run(async () => {
            if (!selected || !confirmRevokeAssignment) return;
            await revokeGroupAssignment(selected.id, confirmRevokeAssignment.id);
            setAssignments(await listGroupAssignments(selected.id));
            toast.success("Affectation retirée.");
            setConfirmRevokeAssignment(null);
          })
        }
      />
    </div>
  );
}
