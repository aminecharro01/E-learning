"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createVirtualSession,
  deleteVirtualSession,
  listGroupSessions,
  listGroups,
  type VirtualSession,
} from "@/lib/api";
import type { LearnerGroup } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/toast-store";
import { btn, inputClass } from "@/lib/ui";

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function AdminSessionsPage() {
  const { isAdmin } = useAuth();
  const [groups, setGroups] = useState<LearnerGroup[]>([]);
  const [groupId, setGroupId] = useState("");
  const [sessions, setSessions] = useState<VirtualSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState<VirtualSession["provider"]>("JITSI");
  const [joinUrl, setJoinUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");

  const reload = useCallback(async (gid: string) => {
    setSessions(await listGroupSessions(gid));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    listGroups()
      .then((g) => {
        setGroups(g);
        if (g[0]) setGroupId(g[0].id);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Chargement impossible."))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    if (!groupId) return;
    void reload(groupId);
  }, [groupId, reload]);

  if (!isAdmin) {
    return <p className="text-sm text-muted">Réservé aux administrateurs.</p>;
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Classes virtuelles</h1>
          <p className="mt-1 text-sm text-muted">
            Lien externe (Jitsi gratuit sans compte, ou Zoom/Meet créé manuellement) — rappel automatique
            envoyé à la cohorte 1h avant.
          </p>
        </div>
        <select className={inputClass} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <ComponentCard title="Programmer une session" desc="">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputClass} placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className={inputClass} value={provider} onChange={(e) => setProvider(e.target.value as VirtualSession["provider"])}>
            <option value="JITSI">Jitsi (gratuit)</option>
            <option value="ZOOM">Zoom</option>
            <option value="GOOGLE_MEET">Google Meet</option>
            <option value="OTHER">Autre</option>
          </select>
          <input className={inputClass} placeholder="Lien de la session" value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} />
          <input type="datetime-local" className={inputClass} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          <input type="number" className={inputClass} placeholder="Durée (min)" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <button
          type="button"
          className={`${btn.primarySm} mt-3`}
          disabled={busy || !title.trim() || !joinUrl.trim() || !scheduledAt || !groupId}
          onClick={() =>
            void run(async () => {
              await createVirtualSession({
                groupId,
                title: title.trim(),
                provider,
                joinUrl: joinUrl.trim(),
                scheduledAt: new Date(scheduledAt).toISOString(),
                durationMinutes: Number(duration) || 60,
              });
              setTitle("");
              setJoinUrl("");
              setScheduledAt("");
              await reload(groupId);
              toast.success("Session programmée.");
            })
          }
        >
          Programmer
        </button>
      </ComponentCard>

      <ComponentCard title="Sessions programmées" desc={`${sessions.length} session(s)`}>
        {loading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted">Aucune session pour cette cohorte.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-theme px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-heading">{s.title}</p>
                  <p className="text-xs text-muted">
                    {s.provider} — {formatDateTime(s.scheduledAt)} ({s.durationMinutes} min)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={s.joinUrl} target="_blank" rel="noopener noreferrer" className={btn.secondaryXs}>
                    Ouvrir le lien
                  </a>
                  <button
                    type="button"
                    className={btn.dangerXs}
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await deleteVirtualSession(s.id);
                        await reload(groupId);
                        toast.success("Session supprimée.");
                      })
                    }
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ComponentCard>
    </div>
  );
}
