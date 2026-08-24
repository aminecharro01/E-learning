"use client";

import { useEffect, useState } from "react";
import { NotebookPen, Pencil, Trash2, X, Check } from "lucide-react";
import {
  createLessonNote,
  deleteLessonNote,
  listLessonNotes,
  updateLessonNote,
  type LessonNote,
} from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { btn, inputClass } from "@/lib/ui";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

type Props = { lessonId: string };

/** Carnet de notes personnelles par leçon, à droite du lecteur — inspiré de Coursera.
 * Strictement privé : jamais visible par un autre utilisateur, staff compris. */
export function LessonNotesPanel({ lessonId }: Props) {
  const [notes, setNotes] = useState<LessonNote[] | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    listLessonNotes(lessonId)
      .then(setNotes)
      .catch(() => setNotes([]));
  }

  useEffect(() => {
    setNotes(null);
    setEditingId(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function onAdd() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setPosting(true);
    setError(null);
    try {
      await createLessonNote(lessonId, trimmed);
      setDraft("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Ajout impossible.");
    } finally {
      setPosting(false);
    }
  }

  async function onSaveEdit(id: string) {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    setPosting(true);
    setError(null);
    try {
      await updateLessonNote(id, trimmed);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Modification impossible.");
    } finally {
      setPosting(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteLessonNote(id);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression impossible.");
    }
  }

  return (
    <div className="card-theme rounded-2xl p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-heading">
        <NotebookPen size={16} aria-hidden />
        Mes notes
      </p>
      <p className="mt-0.5 text-xs text-muted">Visibles uniquement par vous.</p>

      <div className="mt-3 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Notez une idée, un point à retenir…"
          rows={3}
          className={inputClass}
          maxLength={4000}
        />
        <button
          type="button"
          className={`${btn.primarySm} w-full`}
          disabled={posting || !draft.trim()}
          onClick={() => void onAdd()}
        >
          Ajouter
        </button>
      </div>

      {error && <p className="alert alert-warning mt-2 text-xs">{error}</p>}

      <ul className="mt-4 space-y-2">
        {notes === null && <li className="text-xs text-muted">Chargement…</li>}
        {notes?.length === 0 && <li className="text-xs text-muted">Aucune note pour cette section.</li>}
        {notes?.map((n) => (
          <li key={n.id} className="rounded-xl border border-theme p-2.5">
            {editingId === n.id ? (
              <div className="space-y-1.5">
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={3}
                  className={inputClass}
                  maxLength={4000}
                  autoFocus
                />
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    className={btn.icon}
                    aria-label="Annuler"
                    title="Annuler"
                    onClick={() => setEditingId(null)}
                  >
                    <X size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={btn.icon}
                    aria-label="Enregistrer"
                    title="Enregistrer"
                    disabled={posting || !editDraft.trim()}
                    onClick={() => void onSaveEdit(n.id)}
                  >
                    <Check size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] text-muted">{formatDate(n.updatedAt)}</span>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      className={btn.icon}
                      aria-label="Modifier"
                      title="Modifier"
                      onClick={() => {
                        setEditingId(n.id);
                        setEditDraft(n.body);
                      }}
                    >
                      <Pencil size={12} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={btn.icon}
                      aria-label="Supprimer"
                      title="Supprimer"
                      onClick={() => void onDelete(n.id)}
                    >
                      <Trash2 size={12} aria-hidden className="text-[var(--danger)]" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground">{n.body}</p>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
