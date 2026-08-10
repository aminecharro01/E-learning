"use client";

import { useCallback, useEffect, useState } from "react";
import { createCampaign, listCampaigns, listGroups, sendCampaign, type Campaign } from "@/lib/api";
import type { LearnerGroup } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/toast-store";
import { btn, inputClass } from "@/lib/ui";

const AUDIENCE_LABEL: Record<Campaign["targetAudience"], string> = {
  NEWSLETTER_SUBSCRIBERS: "Abonnés infolettre",
  ALL_STUDENTS: "Tous les apprenants",
  SPECIFIC_GROUP: "Une cohorte précise",
};

const STATUS_LABEL: Record<Campaign["status"], string> = {
  DRAFT: "Brouillon",
  SENDING: "Envoi en cours…",
  SENT: "Envoyée",
  FAILED: "Échec",
};

export default function AdminCampaignsPage() {
  const { isAdmin } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [groups, setGroups] = useState<LearnerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendTarget, setSendTarget] = useState<Campaign | null>(null);

  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [audience, setAudience] = useState<Campaign["targetAudience"]>("NEWSLETTER_SUBSCRIBERS");
  const [groupId, setGroupId] = useState("");

  const reload = useCallback(async () => {
    setCampaigns(await listCampaigns());
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([reload(), listGroups()])
      .then(([, g]) => setGroups(g))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger les campagnes."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) {
    return <p className="text-sm text-muted">Réservé aux administrateurs (envoi de masse).</p>;
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
        <h1 className="text-2xl font-semibold text-heading">Campagnes email</h1>
        <p className="mt-1 text-sm text-muted">
          Newsletter et annonces en masse — envoi asynchrone, débit maîtrisé pour ne pas saturer le SMTP.
        </p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <ComponentCard title="Nouvelle campagne" desc="Brouillon — à envoyer manuellement une fois prêt">
        <div className="space-y-2">
          <input className={inputClass} placeholder="Objet" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea
            className={inputClass}
            rows={5}
            placeholder="Contenu (HTML autorisé)"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value as Campaign["targetAudience"])}>
              <option value="NEWSLETTER_SUBSCRIBERS">Abonnés infolettre</option>
              <option value="ALL_STUDENTS">Tous les apprenants</option>
              <option value="SPECIFIC_GROUP">Une cohorte précise</option>
            </select>
            {audience === "SPECIFIC_GROUP" && (
              <select className={inputClass} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">— Choisir une cohorte —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            type="button"
            className={btn.primarySm}
            disabled={busy || !subject.trim() || !htmlBody.trim() || (audience === "SPECIFIC_GROUP" && !groupId)}
            onClick={() =>
              void run(async () => {
                await createCampaign({
                  subject: subject.trim(),
                  htmlBody,
                  targetAudience: audience,
                  targetGroupId: audience === "SPECIFIC_GROUP" ? groupId : undefined,
                });
                setSubject("");
                setHtmlBody("");
                await reload();
                toast.success("Brouillon créé.");
              })
            }
          >
            Créer le brouillon
          </button>
        </div>
      </ComponentCard>

      <ComponentCard title="Campagnes" desc={`${campaigns.length} campagne(s)`}>
        {loading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted">Aucune campagne pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {campaigns.map((c) => (
              <li key={c.id} className="rounded-xl border border-theme p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-heading">{c.subject}</p>
                      <span
                        className={`badge-inline ${
                          c.status === "SENT" ? "badge-success" : c.status === "FAILED" ? "badge-alert" : "badge-gold"
                        }`}
                      >
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {AUDIENCE_LABEL[c.targetAudience]}
                      {c.recipientCount > 0 && ` — ${c.sentCount}/${c.recipientCount} envoyé(s)`}
                      {c.failedCount > 0 && `, ${c.failedCount} échec(s)`}
                    </p>
                  </div>
                  {c.status === "DRAFT" && (
                    <button
                      type="button"
                      className={btn.primarySm}
                      disabled={busy}
                      onClick={() => setSendTarget(c)}
                    >
                      Envoyer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ComponentCard>

      <ConfirmDialog
        open={!!sendTarget}
        title="Envoyer cette campagne ?"
        description={`« ${sendTarget?.subject ?? ""} » sera envoyée immédiatement à : ${
          sendTarget ? AUDIENCE_LABEL[sendTarget.targetAudience] : ""
        }. Cette action est irréversible.`}
        danger
        busy={busy}
        confirmLabel="Envoyer"
        onClose={() => setSendTarget(null)}
        onConfirm={() =>
          void run(async () => {
            if (!sendTarget) return;
            await sendCampaign(sendTarget.id);
            await reload();
            toast.success("Envoi lancé.");
            setSendTarget(null);
          })
        }
      />
    </div>
  );
}
