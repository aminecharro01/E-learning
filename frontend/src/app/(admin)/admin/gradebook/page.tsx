"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download, GraduationCap } from "lucide-react";
import {
  addGradeAdjustment,
  createAssignment,
  deleteAssignment,
  getGradebook,
  getMyProgress,
  gradeSubmission,
  listModuleAssignments,
  listSubmissions,
  type Assignment,
  type GradebookResponse,
  type Submission,
} from "@/lib/api";
import type { Module } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { AccessLocked } from "@/components/admin/ui/AccessLocked";
import { Badge } from "@/components/admin/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/toast-store";
import { btn, inputClass } from "@/lib/ui";
import { resolveAssetUrl } from "@/lib/media";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function initialsOf(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

const STATUS_LABEL: Record<Submission["status"], string> = {
  SUBMITTED: "Déposé",
  LATE: "En retard",
  GRADED: "Corrigé",
};

const STATUS_COLOR: Record<Submission["status"], "info" | "warning" | "success"> = {
  SUBMITTED: "info",
  LATE: "warning",
  GRADED: "success",
};

/** Same green/amber/red thresholds as the learner bulletin, so a director reading this
 * table and a learner reading their own bulletin see the same pass/fail color language. */
function scoreColor(percent: number): "success" | "warning" | "error" {
  if (percent >= 70) return "success";
  if (percent >= 50) return "warning";
  return "error";
}

function CollapseToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={btn.neutralXs} aria-expanded={open} onClick={onToggle}>
      {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
      {open ? "Réduire" : "Ouvrir"}
    </button>
  );
}

export default function AdminGradebookPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("SUPER_ADMIN", "ADMIN", "FORMATEUR");
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gradebook, setGradebook] = useState<GradebookResponse | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newMax, setNewMax] = useState("100");

  const reload = useCallback(async (mid: string) => {
    const [a, g] = await Promise.all([listModuleAssignments(mid), getGradebook(mid)]);
    setAssignments(a);
    setGradebook(g);
    const subs: Record<string, Submission[]> = {};
    await Promise.all(a.map(async (asn) => {
      subs[asn.id] = await listSubmissions(asn.id);
    }));
    setSubmissions(subs);
  }, []);

  useEffect(() => {
    if (!canManage) return;
    getMyProgress()
      .then((p) => {
        setModules(p.modules);
        if (p.modules[0]) setModuleId(p.modules[0].id);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger les modules."))
      .finally(() => setLoading(false));
  }, [canManage]);

  useEffect(() => {
    if (!moduleId) return;
    void reload(moduleId).catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger le carnet de notes."));
  }, [moduleId, reload]);

  if (!canManage) {
    return <AccessLocked reason="Réservé au Directeur, au Formateur et au Super Admin." />;
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

  function exportCsv() {
    if (!gradebook) return;
    const header = ["Apprenant", ...gradebook.evaluations.map((e) => e.label), "Bonus", "Moyenne"];
    const lines = gradebook.rows.map((r) => [
      r.fullName,
      ...gradebook.evaluations.map((e) => (r.scores[e.id] !== undefined ? String(r.scores[e.id]) : "")),
      String(r.bonus),
      r.average !== null ? String(r.average) : "",
    ]);
    const csv = [header, ...lines].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "carnet-de-notes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Devoirs & carnet de notes</h1>
          <p className="mt-1 text-sm text-muted">Corrigez les devoirs et suivez les moyennes, module par module.</p>
        </div>
        <select className={inputClass} value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <ComponentCard
        title="Devoirs du module"
        desc={`${assignments.length} devoir(s)`}
        action={<CollapseToggle open={createOpen} onToggle={() => setCreateOpen((v) => !v)} />}
      >
        {createOpen && (
          <div className="mb-4 grid gap-2 rounded-xl border border-dashed border-theme p-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <input className={inputClass} placeholder="Titre du devoir" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <input type="date" className={inputClass} value={newDue} onChange={(e) => setNewDue(e.target.value)} />
            <input type="number" className={inputClass} placeholder="Max" value={newMax} onChange={(e) => setNewMax(e.target.value)} />
            <button
              type="button"
              className={btn.primarySm}
              disabled={busy || !newTitle.trim() || !moduleId}
              onClick={() =>
                void run(async () => {
                  await createAssignment({
                    moduleId,
                    title: newTitle.trim(),
                    dueAt: newDue ? new Date(newDue).toISOString() : undefined,
                    maxScore: Number(newMax) || 100,
                  });
                  setNewTitle("");
                  setNewDue("");
                  setCreateOpen(false);
                  await reload(moduleId);
                  toast.success("Devoir créé.");
                })
              }
            >
              + Devoir
            </button>
          </div>
        )}

        {loading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : assignments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-theme p-6 text-center text-sm text-muted">
            Aucun devoir pour ce module. Cliquez sur « Ouvrir » ci-dessus pour en créer un.
          </p>
        ) : (
          <ul className="space-y-3">
            {assignments.map((a) => {
              const subs = submissions[a.id] || [];
              const graded = subs.filter((s) => s.status === "GRADED").length;
              const isOpen = expanded[a.id] ?? subs.length > 0;
              return (
                <li key={a.id} className="rounded-xl border border-theme">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 text-left"
                      onClick={() => setExpanded((prev) => ({ ...prev, [a.id]: !isOpen }))}
                    >
                      {isOpen ? <ChevronDown size={16} className="shrink-0 text-muted" aria-hidden /> : <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />}
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-heading">{a.title}</span>
                        <span className="block text-xs text-muted">Échéance : {formatDate(a.dueAt)} · sur {a.maxScore} pts</span>
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Badge size="sm" color={subs.length === 0 ? "light" : graded === subs.length ? "success" : "warning"}>
                        {graded}/{subs.length} corrigé(s)
                      </Badge>
                      <button
                        type="button"
                        className={btn.dangerXs}
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await deleteAssignment(a.id);
                            await reload(moduleId);
                            toast.success("Devoir supprimé.");
                          })
                        }
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-theme p-3">
                      {subs.length === 0 ? (
                        <p className="text-xs text-muted">Aucun dépôt pour l&apos;instant.</p>
                      ) : (
                        <ul className="space-y-2">
                          {subs.map((s) => (
                            <SubmissionRow
                              key={s.id}
                              submission={s}
                              busy={busy}
                              onGrade={(grade, feedback) =>
                                void run(async () => {
                                  await gradeSubmission(s.id, grade, feedback);
                                  await reload(moduleId);
                                  toast.success("Devoir corrigé.");
                                })
                              }
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ComponentCard>

      <ComponentCard
        title="Carnet de notes"
        desc={gradebook ? `${gradebook.rows.length} apprenant(s)` : ""}
        action={
          <button type="button" className={btn.secondarySm} onClick={exportCsv} disabled={!gradebook}>
            Exporter CSV
          </button>
        }
      >
        {!gradebook ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : gradebook.rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-theme p-6 text-center text-sm text-muted">
            Aucune note enregistrée pour ce module.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme text-left">
                  <th className="py-2 pr-3">Apprenant</th>
                  {gradebook.evaluations.map((e) => (
                    <th key={e.id} className="py-2 pr-3 text-xs font-normal text-muted">
                      {e.label}
                    </th>
                  ))}
                  <th className="py-2 pr-3 text-xs font-normal text-muted">Bonus</th>
                  <th className="py-2 pr-3">Moyenne</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {gradebook.rows.map((r) => (
                  <GradebookRow
                    key={r.userId}
                    row={r}
                    evaluations={gradebook.evaluations}
                    moduleId={moduleId}
                    busy={busy}
                    onAdjust={(points, reason) =>
                      void run(async () => {
                        await addGradeAdjustment(r.userId, moduleId, points, reason);
                        await reload(moduleId);
                        toast.success("Bonus ajouté.");
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}

function SubmissionRow({
  submission,
  busy,
  onGrade,
}: {
  submission: Submission;
  busy: boolean;
  onGrade: (grade: number, feedback?: string) => void;
}) {
  const [grade, setGrade] = useState(submission.grade !== null ? String(submission.grade) : "");
  const [feedback, setFeedback] = useState(submission.feedback || "");

  async function openFile() {
    if (!submission.assetId) return;
    try {
      const url = await resolveAssetUrl(submission.assetId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Impossible d'ouvrir le fichier déposé.");
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs">
      <span className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-primary">
          {initialsOf(submission.userFullName)}
        </span>
        <span className="font-medium text-heading">{submission.userFullName}</span>
        <Badge size="sm" color={STATUS_COLOR[submission.status]}>
          {STATUS_LABEL[submission.status]}
        </Badge>
        {submission.assetId && (
          <button
            type="button"
            onClick={() => void openFile()}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Download size={12} aria-hidden /> Voir la copie
          </button>
        )}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className={`${inputClass} w-20`}
          placeholder="Note"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        />
        <input
          className={`${inputClass} w-40`}
          placeholder="Commentaire"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <button
          type="button"
          className={btn.secondaryXs}
          disabled={busy || grade === ""}
          onClick={() => onGrade(Number(grade), feedback || undefined)}
        >
          Noter
        </button>
      </div>
    </li>
  );
}

function GradebookRow({
  row,
  evaluations,
  busy,
  onAdjust,
}: {
  row: GradebookResponse["rows"][number];
  evaluations: GradebookResponse["evaluations"];
  moduleId: string;
  busy: boolean;
  onAdjust: (points: number, reason?: string) => void;
}) {
  const [points, setPoints] = useState("");
  return (
    <tr className="border-b border-theme/60">
      <td className="py-2 pr-3">
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold text-primary">
            {initialsOf(row.fullName)}
          </span>
          <span className="font-medium text-heading">{row.fullName}</span>
        </span>
      </td>
      {evaluations.map((e) => {
        const score = row.scores[e.id];
        return (
          <td key={e.id} className="py-2 pr-3 tabular-nums">
            {score !== undefined ? (
              <Badge size="sm" color={scoreColor(score)}>
                {score}%
              </Badge>
            ) : (
              <span className="text-muted">—</span>
            )}
          </td>
        );
      })}
      <td className="py-2 pr-3 tabular-nums">{row.bonus > 0 ? `+${row.bonus}` : row.bonus}</td>
      <td className="py-2 pr-3 tabular-nums">
        {row.average !== null ? (
          <Badge size="md" variant="solid" color={scoreColor(row.average)}>
            <GraduationCap size={12} aria-hidden /> {row.average}%
          </Badge>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1">
          <input type="number" className={`${inputClass} w-16`} placeholder="+/-" value={points} onChange={(e) => setPoints(e.target.value)} />
          <button
            type="button"
            className={btn.secondaryXs}
            disabled={busy || points === ""}
            onClick={() => {
              onAdjust(Number(points), "Ajustement manuel");
              setPoints("");
            }}
          >
            Bonus
          </button>
        </div>
      </td>
    </tr>
  );
}
