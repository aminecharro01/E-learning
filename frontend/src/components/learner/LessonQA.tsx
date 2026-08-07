"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createLessonComment,
  createModuleComment,
  getLessonComments,
  getMe,
  getModuleComments,
  hideLessonComment,
  pinLessonComment,
  unhideLessonComment,
  unpinLessonComment,
} from "@/lib/api";
import type { LessonComment } from "@/types/domain";
import { ApiClientError } from "@/lib/api-client";
import { btn, inputClass } from "@/lib/ui";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type Props = { lessonId?: string; moduleId?: string; title?: string };

/** Forum de discussion — par leçon (Q&A) si `lessonId`, par module (général) si `moduleId`. */
export function LessonQA({ lessonId, moduleId, title = "Questions & réponses" }: Props) {
  const [staff, setStaff] = useState(false);
  const [comments, setComments] = useState<LessonComment[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    getMe()
      .then((user) =>
        setStaff(user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "FORMATEUR")
      )
      .catch(() => setStaff(false));
  }, []);

  function load() {
    const fetcher = lessonId ? getLessonComments(lessonId) : getModuleComments(moduleId!);
    fetcher.then(setComments).catch(() => setComments([]));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, moduleId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setPosting(true);
    setError(null);
    try {
      if (lessonId) await createLessonComment(lessonId, trimmed);
      else await createModuleComment(moduleId!, trimmed);
      setBody("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Envoi impossible.");
    } finally {
      setPosting(false);
    }
  }

  async function onReply(parentId: string) {
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    setPosting(true);
    setError(null);
    try {
      if (lessonId) await createLessonComment(lessonId, trimmed, parentId);
      else await createModuleComment(moduleId!, trimmed, parentId);
      setReplyBody("");
      setReplyTo(null);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Envoi impossible.");
    } finally {
      setPosting(false);
    }
  }

  async function onHide(id: string, hidden: boolean) {
    await (hidden ? unhideLessonComment(id) : hideLessonComment(id)).catch(() => undefined);
    load();
  }

  async function onPin(id: string, pinned: boolean) {
    await (pinned ? unpinLessonComment(id) : pinLessonComment(id)).catch(() => undefined);
    load();
  }

  return (
    <div className="mt-8 border-t border-theme pt-6">
      <h2 className="text-lg font-bold text-heading">{title}</h2>

      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Poser une question, lancer une discussion…"
          className={`${inputClass} flex-1`}
          maxLength={2000}
        />
        <button type="submit" disabled={posting || !body.trim()} className={btn.primarySm}>
          {posting ? "…" : "Publier"}
        </button>
      </form>
      {error && <p className="alert alert-warning mt-2">{error}</p>}

      <ul className="mt-4 space-y-3">
        {comments === null && <li className="text-sm text-muted">Chargement…</li>}
        {comments?.length === 0 && (
          <li className="text-sm text-muted">Aucune discussion pour l&apos;instant.</li>
        )}
        {comments?.map((c) => (
          <li key={c.id} className="card-theme rounded-xl p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-heading">
                {c.authorName}
                {c.authorStaff && <span className="badge-inline badge-gold ml-2">Formateur</span>}
                {c.pinned && <span className="badge-inline badge-success ml-2">Épinglé</span>}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{formatDate(c.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                  className={btn.secondaryXs}
                >
                  Répondre
                </button>
                {staff && (
                  <>
                    <button type="button" onClick={() => void onPin(c.id, c.pinned)} className={btn.secondaryXs}>
                      {c.pinned ? "Désépingler" : "Épingler"}
                    </button>
                    <button type="button" onClick={() => void onHide(c.id, c.hidden)} className={btn.dangerXs}>
                      {c.hidden ? "Réafficher" : "Masquer"}
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="mt-1 text-sm text-foreground">{c.body}</p>
            {c.hidden && <p className="mt-1 text-xs italic text-muted">Masqué</p>}

            {replyTo === c.id && (
              <div className="mt-2 flex gap-2">
                <input
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Votre réponse…"
                  className={`${inputClass} flex-1`}
                  maxLength={2000}
                />
                <button
                  type="button"
                  disabled={posting || !replyBody.trim()}
                  onClick={() => void onReply(c.id)}
                  className={btn.primarySm}
                >
                  Répondre
                </button>
              </div>
            )}

            {c.replies.length > 0 && (
              <ul className="mt-3 space-y-2 border-l-2 border-theme pl-3">
                {c.replies.map((r) => (
                  <li key={r.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-heading">
                        {r.authorName}
                        {r.authorStaff && <span className="badge-inline badge-gold ml-2">Formateur</span>}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
                        {staff && (
                          <button type="button" onClick={() => void onHide(r.id, r.hidden)} className={btn.dangerXs}>
                            {r.hidden ? "Réafficher" : "Masquer"}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{r.body}</p>
                    {r.hidden && <p className="mt-1 text-xs italic text-muted">Masqué</p>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
