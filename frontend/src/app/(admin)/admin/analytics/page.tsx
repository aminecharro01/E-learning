"use client";

import { useCallback, useEffect, useState } from "react";
import { getInactiveStudents, getModuleTimeBreakdown, getMyProgress } from "@/lib/api";
import type { Module } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { inputClass } from "@/lib/ui";

function formatMinutes(seconds: number) {
  return `${Math.round(seconds / 60)} min`;
}

function formatDate(iso: string | null) {
  if (!iso) return "Jamais";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminAnalyticsPage() {
  const { isAdmin } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [days, setDays] = useState(7);
  const [inactive, setInactive] = useState<Awaited<ReturnType<typeof getInactiveStudents>>>([]);
  const [timeBreakdown, setTimeBreakdown] = useState<Awaited<ReturnType<typeof getModuleTimeBreakdown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInactive = useCallback(async (d: number) => {
    setInactive(await getInactiveStudents(d));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([getMyProgress(), loadInactive(days)])
      .then(([p]) => {
        setModules(p.modules);
        if (p.modules[0]) setModuleId(p.modules[0].id);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Chargement impossible."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!moduleId) return;
    getModuleTimeBreakdown(moduleId).then(setTimeBreakdown).catch(() => setTimeBreakdown([]));
  }, [moduleId]);

  if (!isAdmin) {
    return <p className="text-sm text-muted">Réservé aux administrateurs.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Analytics</h1>
        <p className="mt-1 text-sm text-muted">Temps passé par leçon et alertes d&apos;inactivité (early warning).</p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <ComponentCard
        title="Apprenants inactifs"
        desc="Aucune progression enregistrée depuis le seuil choisi"
      >
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm text-muted">Seuil (jours)</label>
          <input
            type="number"
            min={1}
            className={`${inputClass} w-24`}
            value={days}
            onChange={(e) => {
              const d = Number(e.target.value) || 7;
              setDays(d);
              void loadInactive(d);
            }}
          />
        </div>
        {loading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : inactive.length === 0 ? (
          <p className="text-sm text-muted">Aucun apprenant inactif au-delà de ce seuil.</p>
        ) : (
          <ul className="space-y-1.5">
            {inactive.map((s) => (
              <li
                key={s.userId}
                className="flex items-center justify-between rounded-lg border border-theme px-3 py-1.5 text-sm"
              >
                <span>{s.fullName}</span>
                <span className="text-xs text-muted">
                  Dernière activité : {formatDate(s.lastActivity)} ({s.daysInactive} j)
                </span>
              </li>
            ))}
          </ul>
        )}
      </ComponentCard>

      <ComponentCard title="Temps passé par leçon (30 derniers jours)" desc="">
        <select className={`${inputClass} mb-3`} value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        {timeBreakdown.length === 0 ? (
          <p className="text-sm text-muted">Aucune donnée pour ce module.</p>
        ) : (
          <ul className="space-y-1.5">
            {timeBreakdown.map((t) => {
              const max = Math.max(...timeBreakdown.map((x) => x.totalSeconds), 1);
              return (
                <li key={t.lessonId} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span>{t.lessonTitle}</span>
                    <span className="tabular-nums text-muted">{formatMinutes(t.totalSeconds)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                    <div
                      className="h-1.5 rounded-full bg-[var(--primary)]"
                      style={{ width: `${(t.totalSeconds / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ComponentCard>
    </div>
  );
}
