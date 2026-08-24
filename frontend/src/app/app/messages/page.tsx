"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMe,
  getOrCreateDirectConversation,
  listConversationMessages,
  listConversations,
  listMessagingStaffContacts,
  listUsersPaged,
  sendConversationMessage,
  type ChatMessage,
  type Conversation,
} from "@/lib/api";
import type { User } from "@/types/domain";
import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { btn, inputClass } from "@/lib/ui";
import { ApiClientError } from "@/lib/api-client";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default function MessagesPage() {
  const [me, setMe] = useState<User | null>(null);
  const isStaff = me?.role === "ADMIN" || me?.role === "SUPER_ADMIN" || me?.role === "FORMATEUR";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<User[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const reloadConversations = useCallback(async () => {
    const data = await listConversations();
    setConversations(data);
    setConversationsLoaded(true);
    return data;
  }, []);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void reloadConversations().catch((err) => setError(err instanceof ApiClientError ? err.message : "Impossible de charger les conversations."));
    const interval = setInterval(() => void reloadConversations().catch(() => undefined), 15_000);
    return () => clearInterval(interval);
  }, [reloadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    async function poll() {
      try {
        const list = await listConversationMessages(selectedId!);
        if (!cancelled) setMessages(list);
      } catch {
        // silencieux — le prochain polling réessaiera
      }
    }
    void poll();
    const interval = setInterval(poll, 5_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isStaff || search.trim().length < 2) {
      setCandidates([]);
      return;
    }
    const t = setTimeout(() => {
      listUsersPaged(0, 8, search.trim())
        .then((res) => setCandidates(res.content.filter((u) => u.role === "ETUDIANT")))
        .catch(() => setCandidates([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search, isStaff]);

  // Un apprenant qui n'a encore aucune conversation (pas de cohorte, jamais contacté par
  // le staff) est automatiquement mis en relation avec l'administration — pas de liste à
  // choisir, le message part directement dans la boîte de l'admin.
  useEffect(() => {
    if (!me || isStaff || !conversationsLoaded || conversations.length > 0) return;
    listMessagingStaffContacts()
      .then(async (contacts) => {
        const admin = contacts.find((c) => c.role === "ADMIN") ?? contacts[0];
        if (!admin) return;
        const id = await getOrCreateDirectConversation(admin.id);
        await reloadConversations();
        setSelectedId(id);
      })
      .catch(() => undefined);
  }, [me, isStaff, conversationsLoaded, conversations.length, reloadConversations]);

  async function onSend() {
    if (!selectedId || !body.trim()) return;
    const trimmed = body.trim();
    setBody("");
    try {
      await sendConversationMessage(selectedId, trimmed);
      setMessages(await listConversationMessages(selectedId));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Envoi impossible.");
    }
  }

  async function onStartWith(userId: string) {
    const id = await getOrCreateDirectConversation(userId);
    setSearch("");
    setCandidates([]);
    await reloadConversations();
    setSelectedId(id);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <LearnerAppHeader showParcoursLink />
      <div className="mt-4">
        <h1 className="text-2xl font-semibold text-heading">Messagerie</h1>
        <p className="mt-1 text-sm text-muted">Apprenant ↔ formateur, et le salon de votre cohorte.</p>
      </div>

      {error && <p className="alert alert-warning mt-3">{error}</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          {isStaff && (
            <div>
              <input
                className={inputClass}
                placeholder="Contacter un apprenant…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {candidates.length > 0 && (
                <ul className="mt-1 space-y-1">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-theme px-2 py-1 text-left text-xs"
                        onClick={() => void onStartWith(c.id)}
                      >
                        {c.fullName || c.email}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <ul className="space-y-1.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-xl border border-theme px-3 py-2 text-left text-sm ${
                    c.id === selectedId ? "bg-surface-2 ring-2 ring-[var(--ring)]" : ""
                  }`}
                >
                  <span className="block font-medium text-heading">{c.title}</span>
                  {c.lastMessagePreview && (
                    <span className="block truncate text-xs text-muted">{c.lastMessagePreview}</span>
                  )}
                </button>
              </li>
            ))}
            {conversations.length === 0 && <p className="text-sm text-muted">Aucune conversation.</p>}
          </ul>
        </div>

        <div className="card-theme flex h-[60dvh] flex-col rounded-2xl p-4">
          {!selectedId ? (
            <p className="m-auto text-sm text-muted">Sélectionnez une conversation.</p>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                    <p className="text-xs font-semibold text-heading">
                      {m.senderName} <span className="font-normal text-muted">{formatTime(m.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 text-body">{m.body}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Votre message…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void onSend()}
                />
                <button type="button" className={btn.primarySm} onClick={() => void onSend()}>
                  Envoyer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
