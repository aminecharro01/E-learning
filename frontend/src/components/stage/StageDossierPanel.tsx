"use client";

import { useState } from "react";
import {
  deleteStageDocument,
  uploadAsset,
  uploadStageDocument,
  type LearnerDocType,
  type LearnerDossier,
} from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";
import { Stepper, Step, type StepStatus } from "@/components/ui/Stepper";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Props = {
  dossier: LearnerDossier;
  mode: "learner" | "staff";
  onChanged: () => void;
};

export function StageDossierPanel({ dossier, mode, onChanged }: Props) {
  const [busyType, setBusyType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LearnerDossier["documents"][number] | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const canUpload = (owner: string) =>
    mode === "staff" || (mode === "learner" && owner === "LEARNER");

  async function onUpload(docType: LearnerDocType, file: File | null) {
    if (!file) return;
    setBusyType(docType);
    setError(null);
    setMsg(null);
    try {
      const asset = await uploadAsset(file, "DOCUMENT");
      const learnerId = mode === "learner" ? "me" : dossier.learnerId;
      await uploadStageDocument(learnerId, { docType, assetId: asset.id });
      setMsg("Document déposé.");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Envoi impossible.");
    } finally {
      setBusyType(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setError(null);
    try {
      await deleteStageDocument(deleteTarget.id);
      setMsg("Document supprimé.");
      onChanged();
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression du document impossible.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const stageSlots = dossier.slots.filter((s) => s.section === "STAGE");
  const soutenanceSlots = dossier.slots.filter((s) => s.section === "SOUTENANCE");

  return (
    <div className="space-y-6">
      {error && <p className="alert alert-warning">{error}</p>}
      {msg && <p className="alert alert-success">{msg}</p>}

      <div className="flex flex-wrap gap-3 text-sm">
        <span
          className={`rounded-full px-3 py-1 font-semibold ${
            dossier.stageComplete
              ? "bg-[var(--alert-success-bg)] text-[var(--alert-success-fg)]"
              : "bg-surface-2 text-muted"
          }`}
        >
          Stage {dossier.stageComplete ? "complet" : "incomplet"}
        </span>
        <span
          className={`rounded-full px-3 py-1 font-semibold ${
            dossier.soutenanceComplete
              ? "bg-[var(--alert-success-bg)] text-[var(--alert-success-fg)]"
              : "bg-surface-2 text-muted"
          }`}
        >
          Soutenance {dossier.soutenanceComplete ? "complète" : "incomplète"}
        </span>
      </div>

      <Section title="Stage en milieu réel" slots={stageSlots} />
      <Section title="Travaux de synthèse / Soutenance" slots={soutenanceSlots} />

      <div className="card-theme rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-heading">Historique des dépôts</h3>
        {dossier.documents.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Aucun document pour le moment.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dossier.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-theme px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-heading">{doc.filename}</p>
                  <p className="text-xs text-muted">
                    {doc.docType} · {doc.uploadedByName} ·{" "}
                    {new Intl.DateTimeFormat("fr-FR").format(new Date(doc.createdAt))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`${API_URL}${doc.downloadUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className={btn.secondaryXs}
                  >
                    Voir
                  </a>
                  {(mode === "staff" ||
                    doc.docType === "CONVENTION_ENTREPRISE" ||
                    doc.docType === "RAPPORT_STAGE" ||
                    doc.docType === "PRESENTATION_SOUTENANCE") && (
                    <button type="button" className={btn.dangerXs} onClick={() => setDeleteTarget(doc)}>
                      Supprimer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer ce document ?"
        description={`« ${deleteTarget?.filename ?? ""} » sera définitivement supprimé du dossier.`}
        danger
        busy={deleteBusy}
        confirmLabel="Supprimer"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );

  function Section({
    title,
    slots,
  }: {
    title: string;
    slots: LearnerDossier["slots"];
  }) {
    return (
      <section className="card-theme rounded-2xl p-5">
        <h2 className="text-lg font-bold text-heading">{title}</h2>
        <Stepper className="mt-4">
          {slots.map((slot, index) => {
            const status: StepStatus = slot.filled ? "done" : canUpload(slot.owner) ? "current" : "pending";
            return (
              <Step
                key={slot.docType}
                status={status}
                isLast={index === slots.length - 1}
                title={
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-heading">{slot.label}</p>
                      <p className="mt-1 text-xs text-muted">
                        {slot.owner === "DIRECTOR" ? "Dépôt académie / directeur" : "Dépôt apprenant"}
                        {slot.filled ? " · Déposé" : " · Manquant"}
                      </p>
                    </div>
                    {canUpload(slot.owner) && (
                      <label className={`${btn.secondarySm} cursor-pointer`}>
                        {busyType === slot.docType ? "…" : slot.filled ? "Remplacer" : "Déposer"}
                        <input
                          type="file"
                          className="hidden"
                          accept={
                            slot.docType === "PRESENTATION_SOUTENANCE"
                              ? ".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                              : ".pdf,.doc,.docx,.ppt,.pptx,.odt"
                          }
                          disabled={busyType === slot.docType}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            e.target.value = "";
                            void onUpload(slot.docType, file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                }
              >
                {canUpload(slot.owner) && slot.docType === "CONVENTION_ENTREPRISE" && (
                  <p className="mt-2 text-xs text-muted">
                    <a
                      href={`${API_URL}/documents/convention-de-stage-modele.docx`}
                      className="font-medium text-primary hover:underline"
                    >
                      Télécharger le modèle de convention
                    </a>{" "}
                    · faites-le signer par l&apos;entreprise puis déposez-le ici.
                  </p>
                )}
                {canUpload(slot.owner) && (
                  <p className="mt-2 text-xs text-muted">
                    {slot.docType === "PRESENTATION_SOUTENANCE"
                      ? "Formats acceptés : PDF ou PowerPoint (.ppt / .pptx)."
                      : "Formats : PDF, Word, PowerPoint."}
                  </p>
                )}
                {!canUpload(slot.owner) && !slot.filled && (
                  <p className="mt-2 text-xs text-muted">En attente du dépôt par l&apos;autre partie.</p>
                )}
              </Step>
            );
          })}
        </Stepper>
      </section>
    );
  }
}
