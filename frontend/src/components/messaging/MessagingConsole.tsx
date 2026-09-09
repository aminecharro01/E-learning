"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, GraduationCap, LifeBuoy, MessageCircle, Search, Send, Users } from "lucide-react";
import {
  getMe,
  getOrCreateDirectConversation,
  listConversationMessages,
  listConversations,
  listMessagingStaffContacts,
  listMessagingSupportContacts,
  listUsersPaged,
  markConversationRead,
  sendConversationMessage,
  type ChatMessage,
  type Conversation,
  type StaffContact,
  type SupportContact,
} from "@/lib/api";
import type { User } from "@/types/domain";
import { btn, inputClass } from "@/lib/ui";
import { ApiClientError } from "@/lib/api-client";

const GROUP_GAP_MS = 5 * 60 * 1000;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Short timestamp for the conversation list: time if today, else a short date. */
function formatListTime(iso: string) {
  const date = new Date(iso);
  if (isSameDay(date, new Date())) return formatTime(iso);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
}

/** Day separator label shown between message groups. */
function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, yesterday)) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  }).format(date);
}

type FeedItem =
  | { kind: "date"; key: string; label: string }
  | { kind: "msg"; key: string; msg: ChatMessage; showMeta: boolean; own: boolean };

/** Conversation list + chat pane, shared between the learner (/app/messages) and staff
 * (/admin/messages) routes — neither has to leave their own space to check messages. */
export function MessagingConsole() {
  const [me, setMe] = useState<User | null>(null);
  const isStaff = me?.role === "ADMIN" || me?.role === "SUPER_ADMIN" || me?.role === "FORMATEUR";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<User[]>([]);
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);
  const [staffContacts, setStaffContacts] = useState<StaffContact[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        await markConversationRead(selectedId!).catch(() => undefined);
        if (!cancelled) {
          setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)));
        }
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

  // Annuaire "support" (épinglé) + "professeurs & administration" pour qu'un apprenant
  // puisse lui-même choisir qui contacter, plutôt que d'attendre d'être contacté.
  useEffect(() => {
    if (!me || isStaff) return;
    listMessagingSupportContacts()
      .then(setSupportContacts)
      .catch(() => setSupportContacts([]));
    listMessagingStaffContacts()
      .then(setStaffContacts)
      .catch(() => setStaffContacts([]));
  }, [me, isStaff]);

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

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    messages.forEach((m, i) => {
      const prev = messages[i - 1];
      if (!prev || !isSameDay(new Date(prev.createdAt), new Date(m.createdAt))) {
        items.push({ kind: "date", key: `date-${m.id}`, label: dayLabel(m.createdAt) });
      }
      const gapTooLong = prev ? new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_GAP_MS : true;
      const showMeta = !prev || prev.senderId !== m.senderId || gapTooLong;
      items.push({ kind: "msg", key: m.id, msg: m, showMeta, own: m.senderId === me?.id });
    });
    return items;
  }, [messages, me?.id]);

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  async function onSend() {
    if (!selectedId || !body.trim()) return;
    const trimmed = body.trim();
    setBody("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-heading">Messagerie</h1>
        <p className="mt-1 text-sm text-muted">Apprenant ↔ formateur, et le salon de votre cohorte.</p>
      </div>

      {error && <p className="alert alert-warning mt-3">{error}</p>}

      <div className="card-theme mt-4 grid overflow-hidden rounded-2xl border border-theme lg:h-[72dvh] lg:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <div className={`min-h-0 flex-col border-theme lg:flex lg:border-r ${selectedId ? "hidden" : "flex"}`}>
          {isStaff && (
            <div className="border-b border-theme p-3">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  className={`${inputClass} pl-9`}
                  placeholder="Contacter un apprenant…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {candidates.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg border border-theme px-2 py-1.5 text-left text-xs hover:bg-surface-2"
                        onClick={() => void onStartWith(c.id)}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--neutral)] text-[10px] font-semibold text-[var(--neutral-fg)]">
                          {initials(c.fullName || c.email)}
                        </span>
                        <span className="truncate">{c.fullName || c.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!isStaff && (supportContacts.length > 0 || staffContacts.length > 0) && (
            <div className="space-y-3 border-b border-theme p-3">
              {supportContacts.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-heading">
                    <LifeBuoy size={13} className="text-[var(--primary)]" aria-hidden />
                    Support
                  </p>
                  <ul className="space-y-1">
                    {supportContacts.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg border border-theme px-2 py-1.5 text-left text-xs hover:bg-surface-2"
                          onClick={() => void onStartWith(c.id)}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-semibold text-[var(--primary-fg)]">
                            {initials(c.fullName)}
                          </span>
                          <span className="truncate">{c.fullName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {staffContacts.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-heading">
                    <GraduationCap size={13} aria-hidden />
                    Professeurs & administration
                  </p>
                  <ul className="max-h-32 space-y-1 overflow-y-auto">
                    {staffContacts.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg border border-theme px-2 py-1.5 text-left text-xs hover:bg-surface-2"
                          onClick={() => void onStartWith(c.id)}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--neutral)] text-[10px] font-semibold text-[var(--neutral-fg)]">
                            {initials(c.fullName)}
                          </span>
                          <span className="truncate">{c.fullName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {conversations.map((c) => {
              const active = c.id === selectedId;
              const isRoom = c.type === "COHORT_ROOM";
              return (
                <li key={c.id} className="border-b border-theme last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-2 ${
                      active ? "bg-surface-2" : ""
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        isRoom
                          ? "bg-[var(--primary)] text-[var(--primary-fg)]"
                          : "bg-[var(--neutral)] text-[var(--neutral-fg)]"
                      }`}
                    >
                      {isRoom ? <Users size={16} aria-hidden /> : initials(c.title)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span
                          className={`truncate text-sm text-heading ${c.unreadCount > 0 ? "font-semibold" : "font-medium"}`}
                        >
                          {c.title}
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          {c.lastMessageAt && (
                            <span className="text-[11px] text-muted">{formatListTime(c.lastMessageAt)}</span>
                          )}
                          {c.unreadCount > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-[var(--primary-fg)]">
                              {c.unreadCount > 9 ? "9+" : c.unreadCount}
                            </span>
                          )}
                        </span>
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-xs ${c.unreadCount > 0 ? "font-medium text-heading" : "text-muted"}`}
                      >
                        {c.lastMessagePreview || "Aucun message"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {conversations.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted">
                <MessageCircle size={28} className="opacity-40" aria-hidden />
                <span className="text-sm">Aucune conversation.</span>
              </li>
            )}
          </ul>
        </div>

        {/* Chat pane */}
        <div className={`min-h-0 flex-col lg:flex ${selectedId ? "flex" : "hidden"}`}>
          {!selectedConversation ? (
            <div className="m-auto flex flex-col items-center gap-2 px-6 text-center text-muted">
              <MessageCircle size={40} className="opacity-30" aria-hidden />
              <p className="text-sm">Sélectionnez une conversation pour commencer.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-theme px-4 py-3">
                <button
                  type="button"
                  className="-ml-1 rounded-lg p-1.5 text-muted hover:bg-surface-2 lg:hidden"
                  onClick={() => setSelectedId(null)}
                  aria-label="Retour à la liste"
                >
                  <ArrowLeft size={18} aria-hidden />
                </button>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    selectedConversation.type === "COHORT_ROOM"
                      ? "bg-[var(--primary)] text-[var(--primary-fg)]"
                      : "bg-[var(--neutral)] text-[var(--neutral-fg)]"
                  }`}
                >
                  {selectedConversation.type === "COHORT_ROOM" ? (
                    <Users size={15} aria-hidden />
                  ) : (
                    initials(selectedConversation.title)
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-heading">{selectedConversation.title}</p>
                  <p className="text-xs text-muted">
                    {selectedConversation.type === "COHORT_ROOM" ? "Salon de cohorte" : "Conversation directe"}
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-4">
                {feed.map((item) => {
                  if (item.kind === "date") {
                    return (
                      <div key={item.key} className="my-3 flex items-center justify-center">
                        <span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] font-medium text-muted">
                          {item.label}
                        </span>
                      </div>
                    );
                  }
                  const { msg, showMeta, own } = item;
                  return (
                    <div key={item.key} className={`flex ${own ? "justify-end" : "justify-start"} ${showMeta ? "mt-3" : "mt-0.5"}`}>
                      <div className={`max-w-[75%] ${own ? "items-end" : "items-start"} flex flex-col`}>
                        {showMeta && !own && (
                          <span className="mb-0.5 px-1 text-[11px] font-semibold text-muted">{msg.senderName}</span>
                        )}
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm ${
                            own
                              ? "rounded-br-sm bg-[var(--primary)] text-[var(--primary-fg)]"
                              : "rounded-bl-sm bg-surface-2 text-body"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                        </div>
                        <span className="mt-0.5 px-1 text-[10px] text-muted">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-theme p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    className={`${inputClass} max-h-[120px] flex-1 resize-none py-2.5`}
                    placeholder="Votre message…"
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      autosize(e.target);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void onSend();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={`${btn.iconPrimary} shrink-0`}
                    onClick={() => void onSend()}
                    disabled={!body.trim()}
                    aria-label="Envoyer"
                  >
                    <Send size={16} aria-hidden />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
