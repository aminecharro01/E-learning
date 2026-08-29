"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createJobOffer,
  deleteJobOffer,
  listJobOffersAdmin,
  updateJobOffer,
  type CreateJobOfferPayload,
  type JobOffer,
} from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { resolveAssetUrl, uploadMedia } from "@/lib/media";
import { useAuth } from "@/hooks/useAuth";
import { ComponentCard } from "@/components/admin/ui/ComponentCard";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/toast-store";
import { btn, inputClass } from "@/lib/ui";

const CONTRACT_LABEL: Record<JobOffer["contractType"], string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  FREELANCE: "Freelance",
};

const EMPTY_FORM: CreateJobOfferPayload = {
  title: "",
  company: "",
  description: "",
  location: "",
  contractType: "CDI",
  applyUrl: "",
  contactEmail: "",
  photoAssetId: null,
};

export default function AdminJobOffersPage() {
  const { isFormateur } = useAuth();
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateJobOfferPayload>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<JobOffer | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const reload = useCallback(async () => {
    setOffers(await listJobOffersAdmin());
  }, []);

  useEffect(() => {
    if (!isFormateur) return;
    reload()
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger les offres."))
      .finally(() => setLoading(false));
  }, [isFormateur, reload]);

  if (!isFormateur) {
    return <p className="text-sm text-muted">Réservé au staff pédagogique (Admin, Formateur).</p>;
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

  async function onTogglePublished(offer: JobOffer) {
    await run(async () => {
      await updateJobOffer(offer.id, {
        title: offer.title,
        company: offer.company,
        description: offer.description,
        location: offer.location || undefined,
        contractType: offer.contractType,
        applyUrl: offer.applyUrl || undefined,
        contactEmail: offer.contactEmail || undefined,
        photoAssetId: offer.photoAssetId,
        expiresAt: offer.expiresAt,
        published: !offer.published,
      });
      await reload();
      toast.success(offer.published ? "Offre dépubliée." : "Offre publiée.");
    });
  }

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const asset = await uploadMedia(file, "IMAGE");
      setForm((f) => ({ ...f, photoAssetId: asset.id }));
      setPhotoPreviewUrl(await resolveAssetUrl(asset.id));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Impossible d'envoyer la photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setPhotoPreviewUrl(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Bourse à l&apos;emploi (alumni)</h1>
        <p className="mt-1 text-sm text-muted">
          Offres visibles uniquement par les apprenants diplômés (attestation émise).
        </p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <ComponentCard title="Nouvelle offre" desc="Publiée immédiatement pour les diplômés">
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={inputClass}
              placeholder="Intitulé du poste"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Entreprise"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
          </div>
          <textarea
            className={inputClass}
            rows={4}
            placeholder="Description du poste"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={inputClass}
              placeholder="Lieu (optionnel)"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            <select
              className={inputClass}
              value={form.contractType}
              onChange={(e) => setForm((f) => ({ ...f, contractType: e.target.value as JobOffer["contractType"] }))}
            >
              {Object.entries(CONTRACT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={inputClass}
              placeholder="Lien de candidature (optionnel)"
              value={form.applyUrl}
              onChange={(e) => setForm((f) => ({ ...f, applyUrl: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Email de contact (optionnel)"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className={`${btn.neutralSm} cursor-pointer`}>
              {uploadingPhoto ? "Envoi…" : photoPreviewUrl ? "Changer la photo" : "Ajouter une photo (optionnel)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhoto || busy}
                onChange={(e) => void onPickPhoto(e.target.files?.[0])}
              />
            </label>
            {form.photoAssetId && (
              <button
                type="button"
                className="text-xs text-[var(--danger)] hover:underline"
                onClick={() => {
                  setForm((f) => ({ ...f, photoAssetId: null }));
                  setPhotoPreviewUrl(null);
                }}
              >
                Retirer
              </button>
            )}
          </div>
          {photoPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreviewUrl} alt="Photo de l'offre" className="max-h-40 rounded-lg border border-theme" />
          )}
          <button
            type="button"
            className={btn.primarySm}
            disabled={busy || !form.title.trim() || !form.company.trim() || !form.description.trim()}
            onClick={() =>
              void run(async () => {
                await createJobOffer({
                  ...form,
                  title: form.title.trim(),
                  company: form.company.trim(),
                  location: form.location?.trim() || undefined,
                  applyUrl: form.applyUrl?.trim() || undefined,
                  contactEmail: form.contactEmail?.trim() || undefined,
                });
                resetForm();
                await reload();
                toast.success("Offre créée.");
              })
            }
          >
            Publier l&apos;offre
          </button>
        </div>
      </ComponentCard>

      <ComponentCard title="Offres" desc={`${offers.length} offre(s)`}>
        {loading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : offers.length === 0 ? (
          <p className="text-sm text-muted">Aucune offre pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {offers.map((o) => {
              const isExpired = !!o.expiresAt && new Date(o.expiresAt).getTime() < Date.now();
              return (
              <li key={o.id} className="rounded-xl border border-theme p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    {o.photoAssetId && <OfferThumbnail assetId={o.photoAssetId} />}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-heading">{o.title}</p>
                        <span className={`badge-inline ${o.published ? "badge-success" : "badge-gold"}`}>
                          {o.published ? "Publiée" : "Dépubliée"}
                        </span>
                        {o.published && isExpired && (
                          <span className="badge-inline badge-alert" title={`Expirée le ${new Date(o.expiresAt as string).toLocaleDateString("fr-FR")}`}>
                            Expirée
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {o.company} — {CONTRACT_LABEL[o.contractType]}
                        {o.location && ` — ${o.location}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btn.neutralSm}
                      disabled={busy}
                      onClick={() => void onTogglePublished(o)}
                    >
                      {o.published ? "Dépublier" : "Publier"}
                    </button>
                    <button
                      type="button"
                      className={btn.dangerSm}
                      disabled={busy}
                      onClick={() => setDeleteTarget(o)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </ComponentCard>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer cette offre ?"
        description={`L'offre « ${deleteTarget?.title ?? ""} » sera définitivement supprimée.`}
        danger
        busy={busy}
        confirmLabel="Supprimer"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          void run(async () => {
            if (!deleteTarget) return;
            await deleteJobOffer(deleteTarget.id);
            await reload();
            toast.success("Offre supprimée.");
            setDeleteTarget(null);
          })
        }
      />
    </div>
  );
}

function OfferThumbnail({ assetId }: { assetId: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveAssetUrl(assetId)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-theme object-cover" />;
}
