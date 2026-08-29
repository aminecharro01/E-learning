"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, ExternalLink, Video } from "lucide-react";
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
import { AccessLocked } from "@/components/admin/ui/AccessLocked";
import { Badge } from "@/components/admin/ui/Badge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/toast-store";
import { btn, inputClass } from "@/lib/ui";

const PROVIDER_LABEL: Record<VirtualSession["provider"], string> = {
  GOOGLE_MEET: "Google Meet",
  ZOOM: "Zoom",
  TEAMS: "Microsoft Teams",
  JITSI: "Jitsi",
  OTHER: "Autre",
};

const PROVIDER_COLOR: Record<VirtualSession["provider"], "success" | "info" | "primary" | "warning" | "light"> = {
  GOOGLE_MEET: "success",
  ZOOM: "info",
  TEAMS: "primary",
  JITSI: "warning",
  OTHER: "light",
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const fieldLabel = "block text-sm font-medium text-heading";

export default function AdminSessionsPage() {
  const { isAdmin } = useAuth();
  const [groups, setGroups] = useState<LearnerGroup[]>([]);
  const [groupId, setGroupId] = useState("");
  const [sessions, setSessions] = useState<VirtualSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<VirtualSession | null>(null);

  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState<VirtualSession["provider"]>("GOOGLE_MEET");
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
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger les sessions."))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    if (!groupId) return;
    void reload(groupId);
  }, [groupId, reload]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [sessions]
  );
  const now = Date.now();
  const upcoming = sortedSessions.filter((s) => new Date(s.scheduledAt).getTime() >= now);
  const past = sortedSessions.filter((s) => new Date(s.scheduledAt).getTime() < now).reverse();

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

  function SessionItem({ s, past: isPast }: { s: VirtualSession; past: boolean }) {
    return (
      <li
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-theme px-3 py-2.5 text-sm ${isPast ? "opacity-60" : ""}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-primary">
            <Video size={16} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-heading">{s.title}</p>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <Badge size="sm" color={PROVIDER_COLOR[s.provider]}>
                {PROVIDER_LABEL[s.provider]}
              </Badge>
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} aria-hidden /> {formatDateTime(s.scheduledAt)} ({s.durationMinutes} min)
              </span>
              {isPast && <Badge size="sm" color="light">Terminée</Badge>}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={s.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn.secondaryXs} inline-flex items-center gap-1`}
          >
            <ExternalLink size={12} aria-hidden /> Ouvrir le lien
          </a>
          <button type="button" className={btn.dangerXs} disabled={busy} onClick={() => setToDelete(s)}>
            Supprimer
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Sessions live</h1>
          <p className="mt-1 text-sm text-muted">
            Lien de visioconférence créé manuellement (Google Meet, Zoom ou Teams) — rappel automatique
            envoyé à la cohorte 1h avant.
          </p>
        </div>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-heading">Cohorte</span>
          <select className={inputClass} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <ComponentCard title="Programmer une session" desc="Tous les champs sont requis.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={fieldLabel}>
            Titre
            <input
              className={`${inputClass} mt-1`}
              placeholder="Ex. Séance de rattrapage UF1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className={fieldLabel}>
            Plateforme
            <select
              className={`${inputClass} mt-1`}
              value={provider}
              onChange={(e) => setProvider(e.target.value as VirtualSession["provider"])}
            >
              <option value="GOOGLE_MEET">Google Meet</option>
              <option value="ZOOM">Zoom</option>
              <option value="TEAMS">Microsoft Teams</option>
            </select>
          </label>
          <label className={fieldLabel}>
            Lien de la session
            <input
              className={`${inputClass} mt-1`}
              placeholder="https://…"
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
            />
          </label>
          <label className={fieldLabel}>
            Date et heure de la session
            <input
              type="datetime-local"
              className={`${inputClass} mt-1`}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </label>
          <label className={fieldLabel}>
            Durée (minutes)
            <input
              type="number"
              className={`${inputClass} mt-1`}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className={`${btn.primarySm} mt-4`}
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
        ) : sortedSessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-theme p-6 text-center text-sm text-muted">
            Aucune session pour cette cohorte. Programmez-en une ci-dessus.
          </p>
        ) : (
          <div className="space-y-4">
            {upcoming.length > 0 && (
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <SessionItem key={s.id} s={s} past={false} />
                ))}
              </ul>
            )}
            {past.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Passées</p>
                <ul className="space-y-2">
                  {past.map((s) => (
                    <SessionItem key={s.id} s={s} past />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </ComponentCard>

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cette session ?"
        description={`« ${toDelete?.title} » sera définitivement supprimée et la cohorte perdra le lien de connexion.`}
        confirmLabel="Supprimer"
        danger
        busy={busy}
        onConfirm={() =>
          void run(async () => {
            if (!toDelete) return;
            await deleteVirtualSession(toDelete.id);
            setToDelete(null);
            await reload(groupId);
            toast.success("Session supprimée.");
          })
        }
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
