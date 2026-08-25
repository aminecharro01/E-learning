"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bot, BookOpen, Send, Sparkles, Trash2, X } from "lucide-react";
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

const MAX_QUESTION_LENGTH = 500;

/** Renders **bold** spans within one line as real <strong> — built as React nodes
 * (never dangerouslySetInnerHTML) so text stays auto-escaped even though it comes
 * from an external AI response. */
function renderInlineBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

/** Gemini/Grok answers are plain LLM text and often include lightweight markdown
 * (bold, bullet lists) even though the widget only ever rendered raw text before —
 * this gives that formatting back without pulling in a markdown dependency. */
function AssistantMessageBody({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let currentList: string[] = [];

  function flushList() {
    if (currentList.length === 0) return;
    const items = currentList;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-4 list-disc space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>{renderInlineBold(item)}</li>
        ))}
      </ul>
    );
    currentList = [];
  }

  text.split("\n").forEach((line, idx) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[*-]\s+(.*)/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
      return;
    }
    flushList();
    if (trimmed !== "") {
      blocks.push(
        <p key={`p-${idx}`} className="mb-1.5 last:mb-0">
          {renderInlineBold(trimmed)}
        </p>
      );
    }
  });
  flushList();

  return <div>{blocks}</div>;
}

/** Amorces génériques — jamais spécifiques à un sujet précis : l'assistant ne répond
 * qu'à partir du contenu réellement débloqué pour l'apprenant (voir CourseAssistantService),
 * donc une suggestion ne doit jamais prétendre connaître un sujet à l'avance. */
const GENERAL_SUGGESTIONS = [
  "Explique-moi ça plus simplement",
  "Donne-moi un exemple concret",
  "Quels sont les points clés à retenir ?",
];

const LESSON_SUGGESTION = "Résume les points clés de cette leçon";

/** Interdit pendant un quiz — /app/quiz/[id] et /app/learn/[moduleId]/quiz/[quizId]. */
function isQuizRoute(pathname: string) {
  return pathname.includes("/quiz/");
}

function isLessonRoute(pathname: string) {
  return pathname.includes("/learn/") && pathname.includes("/s/");
}

/** Assistant de cours (RAG par mots-clés sur le contenu déjà publié et déjà débloqué pour
 * l'apprenant, voir CourseAssistantService) — flottant sur tout l'espace apprenant sauf
 * pendant un quiz. */
export function ChatbotWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (isQuizRoute(pathname ?? "")) {
    return null;
  }

  const suggestions = isLessonRoute(pathname ?? "")
    ? [LESSON_SUGGESTION, ...GENERAL_SUGGESTIONS.slice(0, 2)]
    : GENERAL_SUGGESTIONS;

  async function ask(text: string) {
    const trimmed = text.trim();
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

  function onAsk() {
    void ask(question);
  }

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }

  const remaining = MAX_QUESTION_LENGTH - question.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-[var(--primary-fg)] transition-transform hover:scale-105"
        style={{ background: "var(--wing)", boxShadow: "var(--shadow-brand)" }}
        aria-label={open ? "Fermer l'assistant de cours" : "Ouvrir l'assistant de cours"}
        aria-expanded={open}
        title="Assistant de cours"
      >
        {open ? <X size={22} aria-hidden /> : <Bot size={22} aria-hidden />}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Assistant de cours"
          className="card-theme fixed bottom-24 right-5 z-40 flex h-[70vh] max-h-[560px] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl"
          style={{ boxShadow: "var(--shadow-brand)" }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-theme px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-heading">Assistant de cours</p>
              <p className="text-xs text-muted">Répond à partir de vos cours débloqués — indisponible pendant un quiz.</p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-heading"
                aria-label="Effacer la conversation"
                title="Effacer la conversation"
              >
                <Trash2 size={15} aria-hidden />
              </button>
            )}
          </div>

          <div
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Posez une question sur le contenu de vos cours débloqués — je réponds à partir des leçons déjà
                  accessibles pour vous, et je cite mes sources.
                </p>
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                    <Sparkles size={12} aria-hidden /> Idées de questions
                  </p>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void ask(s)}
                      className="block w-full rounded-lg border border-theme px-3 py-2 text-left text-sm text-body transition-colors hover:border-[var(--primary)] hover:bg-surface-2"
                    >
                      {s === LESSON_SUGGESTION && <BookOpen size={13} className="mr-1.5 inline-block align-[-2px] text-muted" aria-hidden />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
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
                  {m.role === "assistant" ? (
                    <AssistantMessageBody text={m.text} />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  )}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-theme pt-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Sources</p>
                      {m.sources.map((s) => (
                        <Link
                          key={s.lessonId}
                          href={s.link}
                          className="flex items-center gap-1 text-xs text-muted underline hover:text-heading"
                        >
                          <BookOpen size={11} aria-hidden />
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
                maxLength={MAX_QUESTION_LENGTH}
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
                    onAsk();
                  }
                }}
              />
              <button
                type="button"
                className={`${btn.iconPrimary} shrink-0`}
                onClick={onAsk}
                disabled={!question.trim() || loading}
                aria-label="Envoyer"
              >
                <Send size={16} aria-hidden />
              </button>
            </div>
            {remaining <= 80 && (
              <p className={`mt-1 text-right text-[11px] ${remaining <= 0 ? "text-[var(--danger)]" : "text-muted"}`}>
                {remaining} caractère{Math.abs(remaining) > 1 ? "s" : ""} restant{Math.abs(remaining) > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
