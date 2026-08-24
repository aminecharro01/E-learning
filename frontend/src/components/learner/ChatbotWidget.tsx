"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bot, Send, X } from "lucide-react";
import { askCourseAssistant, type AssistantSource } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { Loader } from "@/components/ui/Loader";
import { btn, inputClass } from "@/lib/ui";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: AssistantSource[];
};

/** Interdit pendant un quiz — /app/quiz/[id] et /app/learn/[moduleId]/quiz/[quizId]. */
function isQuizRoute(pathname: string) {
  return pathname.includes("/quiz/");
}

/** Assistant de cours (RAG par mots-clés sur le contenu déjà publié, voir
 * CourseAssistantService) — flottant sur tout l'espace apprenant sauf pendant un quiz. */
export function ChatbotWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (isQuizRoute(pathname ?? "")) {
    return null;
  }

  async function onAsk() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setQuestion("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: trimmed }]);
    setLoading(true);
    try {
      const response = await askCourseAssistant(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: response.answer, sources: response.sources },
      ]);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Assistant indisponible pour le moment.";
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: message }]);
    } finally {
      setLoading(false);
    }
  }

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-[var(--primary-fg)] transition-transform hover:scale-105"
        style={{ background: "var(--wing)", boxShadow: "var(--shadow-brand)" }}
        aria-label={open ? "Fermer l'assistant de cours" : "Ouvrir l'assistant de cours"}
        title="Assistant de cours"
      >
        {open ? <X size={22} aria-hidden /> : <Bot size={22} aria-hidden />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Assistant de cours"
          className="card-theme fixed bottom-24 right-5 z-40 flex h-[70vh] max-h-[560px] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl"
          style={{ boxShadow: "var(--shadow-brand)" }}
        >
          <div className="border-b border-theme px-4 py-3">
            <p className="text-sm font-semibold text-heading">Assistant de cours</p>
            <p className="text-xs text-muted">Répond à partir du contenu des cours — indisponible pendant un quiz.</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted">
                Posez une question sur le contenu de vos cours — je réponds à partir des leçons publiées, et je cite
                mes sources.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "rounded-br-sm bg-[var(--primary)] text-[var(--primary-fg)]"
                      : "rounded-bl-sm bg-surface-2 text-body"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-theme pt-2">
                      {m.sources.map((s) => (
                        <Link
                          key={s.lessonId}
                          href={s.link}
                          className="block text-xs text-muted underline hover:text-heading"
                        >
                          {s.moduleTitle} — {s.lessonTitle}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-surface-2 px-3 py-2.5">
                  <Loader size="sm" tone="current" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-theme p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                className={`${inputClass} max-h-[100px] flex-1 resize-none py-2`}
                placeholder="Votre question…"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  autosize(e.target);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onAsk();
                  }
                }}
              />
              <button
                type="button"
                className={`${btn.iconPrimary} shrink-0`}
                onClick={() => void onAsk()}
                disabled={!question.trim() || loading}
                aria-label="Envoyer"
              >
                <Send size={16} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
