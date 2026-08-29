"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getInactiveStudents, getModuleTimeBreakdown, getMyProgress } from "@/lib/api";
import type { Module } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { AccessLocked } from "@/components/admin/ui/AccessLocked";
import { Skeleton } from "@/components/ui/Skeleton";
import { inputClass } from "@/lib/ui";

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
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger les données d'analytics."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!moduleId) return;
    getModuleTimeBreakdown(moduleId).then(setTimeBreakdown).catch(() => setTimeBreakdown([]));
  }, [moduleId]);

  if (!isAdmin) {
    return <AccessLocked reason="Réservé aux administrateurs." />;
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
          <div style={{ width: "100%", height: Math.max(160, timeBreakdown.length * 44) }}>
            <ResponsiveContainer>
              <BarChart
                data={timeBreakdown.map((t) => ({ ...t, minutes: Math.round(t.totalSeconds / 60) }))}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => `${v} min`}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="lessonTitle"
                  width={160}
                  tick={{ fill: "var(--body)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const row = payload[0].payload as { lessonTitle: string; minutes: number };
                    return (
                      <div className="card-theme rounded-lg px-3 py-2 text-xs shadow-lg">
                        <p className="font-medium text-heading">{row.lessonTitle}</p>
                        <p className="tabular-nums text-muted">{row.minutes} min</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="minutes" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
