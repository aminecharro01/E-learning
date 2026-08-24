"use client";

import { useState } from "react";
import type { AiGenerationPayload } from "@/lib/api";
import { btn, inputClass } from "@/lib/ui";

const TYPE_OPTIONS: { value: AiGenerationPayload["questionType"]; label: string }[] = [
  { value: "SINGLE_CHOICE", label: "Choix unique" },
  { value: "MULTI_CHOICE", label: "Choix multiple" },
  { value: "TRUE_FALSE", label: "Vrai/Faux" },
  { value: "ESSAY", label: "Réponse libre" },
];

type Props = {
  busy: boolean;
  /** Présent quand le quiz est rattaché à une leçon — permet de générer depuis son contenu. */
  lessonId?: string | null;
  onSubmit: (payload: AiGenerationPayload) => void;
};

export function AiGenerateForm({ busy, lessonId, onSubmit }: Props) {
  const [useLessonContent, setUseLessonContent] = useState(!!lessonId);
  const [rawText, setRawText] = useState("");
  const [questionType, setQuestionType] = useState<AiGenerationPayload["questionType"]>("SINGLE_CHOICE");
  const [count, setCount] = useState(3);

  const sourceReady = (useLessonContent && !!lessonId) || rawText.trim().length > 0;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Génère des questions à partir d&apos;un texte source via Gemini (ou Grok en repli) — à relire avant publication.
      </p>

      {lessonId && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useLessonContent}
            onChange={(e) => setUseLessonContent(e.target.checked)}
          />
          Utiliser le contenu de la leçon liée à ce quiz
        </label>
      )}

      {!useLessonContent && (
        <textarea
          className={inputClass}
          rows={5}
          placeholder="Collez le texte source (cours, notes…)"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <select
          className={inputClass}
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value as AiGenerationPayload["questionType"])}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={10}
          className={inputClass}
          value={count}
          onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
        />
      </div>

      <button
        type="button"
        className={btn.primarySm}
        disabled={busy || !sourceReady}
        onClick={() =>
          onSubmit({
            lessonId: useLessonContent && lessonId ? lessonId : undefined,
            rawText: useLessonContent ? undefined : rawText.trim(),
            questionType,
            count,
          })
        }
      >
        Générer
      </button>
    </div>
  );
}
