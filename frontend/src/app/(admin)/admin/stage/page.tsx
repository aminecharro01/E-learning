"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import {
  createStageSignoffInvite,
  getStageDossier,
  getUfValidations,
  listStageDossiers,
  validateLearnerUf,
  type LearnerDossier,
  type UfValidation,
} from "@/lib/api";
import { StageDossierPanel } from "@/components/stage/StageDossierPanel";
import { useAuth } from "@/hooks/useAuth";
import { ApiClientError } from "@/lib/api-client";
import { btn, inputClass } from "@/lib/ui";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminStagePage() {
  const { isAdmin, isFormateur } = useAuth();
  const [list, setList] = useState<LearnerDossier[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<LearnerDossier | null>(null);
  const [validations, setValidations] = useState<UfValidation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteFormFor, setInviteFormFor] = useState<string | null>(null);
  const [tutorEmail, setTutorEmail] = useState("");
  const [tutorName, setTutorName] = useState("");
  const [invitingBusy, setInvitingBusy] = useState(false);

  const reloadList = useCallback(() => {
    return listStageDossiers()
      .then(setList)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Erreur."));
  }, []);

  const reloadDossier = useCallback((id: string) => {
    return Promise.all([getStageDossier(id), getUfValidations(id)])
      .then(([d, v]) => {
        setDossier(d);
        setValidations(v);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Erreur dossier."));
  }, []);

  useEffect(() => {
    if (!isAdmin && !isFormateur) return;
    reloadList().finally(() => setLoading(false));
  }, [isAdmin, isFormateur, reloadList]);

  useEffect(() => {
    if (!selectedId) {
      setDossier(null);
      setValidations([]);
      return;
    }
    void reloadDossier(selectedId);
  }, [selectedId, reloadDossier]);

  async function toggleUf(ufCode: string, validated: boolean) {
    if (!selectedId) return;
    setError(null);
    setMsg(null);
    try {
      await validateLearnerUf(selectedId, { ufCode, validated });
      setMsg(
        validated
          ? `${ufCode} validée par le directeur.`
          : `${ufCode} : validation annulée.`
      );
      await reloadDossier(selectedId);
      await reloadList();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Validation impossible.");
    }
  }

  async function onSendInvite(ufCode: string) {
    if (!selectedId || !tutorEmail.trim()) return;
    setInvitingBusy(true);
    setError(null);
    try {
      const res = await createStageSignoffInvite({
        learnerId: selectedId,
        ufCode,
        tutorEmail: tutorEmail.trim(),
        tutorName: tutorName.trim() || undefined,
      });
      setMsg(res.message);
      setInviteFormFor(null);
      setTutorEmail("");
      setTutorName("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Envoi de l'invitation impossible.");
    } finally {
      setInvitingBusy(false);
    }
  }

  if (!isAdmin && !isFormateur) {
    return <p className="text-sm text-muted">Accès réservé à l&apos;académie.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Stage & soutenance</p>
        <h1 className="mt-1 text-2xl font-bold text-heading">Dossiers apprenants</h1>
        <p className="mt-2 text-sm text-muted">
          Déposez la convention école et l&apos;assurance. Suivez les dépôts apprenant (convention
          entreprise, rapport, présentation).
        </p>
      </div>

      {error && <p className="alert alert-warning">{error}</p>}
      {msg && <p className="alert alert-success">{msg}</p>}
      {loading && <Skeleton card className="h-32 rounded-2xl" />}

      {!loading && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="card-theme max-h-[70vh] overflow-y-auto rounded-2xl p-3">
            <ul className="space-y-1">
              {list.map((item) => (
                <li key={item.learnerId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.learnerId)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      selectedId === item.learnerId
                        ? "bg-primary text-[var(--primary-fg)]"
                        : "hover:bg-surface-2"
                    }`}
                  >
                    <span className="block font-medium">{item.learnerName}</span>
                    <span className="block text-xs opacity-80">{item.learnerEmail}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
                      Stage{" "}
                      {item.stageComplete ? (
                        <CheckCircle2 size={12} aria-hidden />
                      ) : (
                        <Circle size={12} aria-hidden />
                      )}{" "}
                      · Soutenance{" "}
                      {item.soutenanceComplete ? (
                        <CheckCircle2 size={12} aria-hidden />
                      ) : (
                        <Circle size={12} aria-hidden />
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {list.length === 0 && (
              <p className="p-2 text-sm text-muted">Aucun apprenant.</p>
            )}
          </aside>

          <div>
            {!selectedId && (
              <p className="text-sm text-muted">Sélectionnez un apprenant pour gérer son dossier.</p>
            )}
            {dossier && (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-heading">{dossier.learnerName}</h2>
                    <p className="text-sm text-muted">{dossier.learnerEmail}</p>
                  </div>
                  <button
                    type="button"
                    className={btn.secondarySm}
                    onClick={() => {
                      void reloadList();
                      if (selectedId) void reloadDossier(selectedId);
                    }}
                  >
                    Actualiser
                  </button>
                </div>
                <div className="mb-4 card-theme space-y-3 rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-heading">
                    Validation directeur (UF Stage / Soutenance)
                  </h3>
                  <p className="text-xs text-muted">
                    La progression vers l&apos;unité suivante (et l&apos;année 2) exige votre
                    validation pour UF 5 et UF 11 — indépendamment des dépôts de fichiers.
                  </p>
                  {validations.map((v) => (
                    <div key={v.ufCode} className="rounded-xl border border-theme px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-heading">
                            {v.ufCode === "UF 5" ? "UF Stage (année 1)" : "UF Soutenance (année 2)"}
                          </p>
                          <p className="text-xs text-muted">
                            {v.validated
                              ? `Validée${v.validatedByName ? ` par ${v.validatedByName}` : ""}`
                              : "Non validée"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!v.validated && (
                            <button
                              type="button"
                              className={btn.secondarySm}
                              onClick={() =>
                                setInviteFormFor(inviteFormFor === v.ufCode ? null : v.ufCode)
                              }
                            >
                              Inviter un tuteur
                            </button>
                          )}
                          <button
                            type="button"
                            className={v.validated ? btn.secondarySm : btn.successSm}
                            onClick={() => void toggleUf(v.ufCode, !v.validated)}
                          >
                            {v.validated ? "Annuler validation" : "Valider l'unité"}
                          </button>
                        </div>
                      </div>

                      {inviteFormFor === v.ufCode && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-theme pt-3 sm:flex-row sm:items-end">
                          <div className="flex-1">
                            <label className="text-xs text-muted">E-mail du tuteur</label>
                            <input
                              type="email"
                              value={tutorEmail}
                              onChange={(e) => setTutorEmail(e.target.value)}
                              className={`${inputClass} mt-1`}
                              placeholder="tuteur@entreprise.com"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-muted">Nom (optionnel)</label>
                            <input
                              type="text"
                              value={tutorName}
                              onChange={(e) => setTutorName(e.target.value)}
                              className={`${inputClass} mt-1`}
                              placeholder="M./Mme…"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={invitingBusy || !tutorEmail.trim()}
                            className={btn.primarySm}
                            onClick={() => void onSendInvite(v.ufCode)}
                          >
                            {invitingBusy ? "…" : "Envoyer"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <StageDossierPanel
                  dossier={dossier}
                  mode="staff"
                  onChanged={() => {
                    void reloadList();
                    if (selectedId) void reloadDossier(selectedId);
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
