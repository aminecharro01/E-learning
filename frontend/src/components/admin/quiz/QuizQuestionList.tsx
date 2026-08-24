"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Circle, Copy, GripVertical, Image as ImageIcon, Pencil, Trash2 } from "lucide-react";
import type { Question } from "@/types/domain";
import { btn } from "@/lib/ui";

type Props = {
  questions: Question[];
  onReorder: (event: DragEndEvent) => void;
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
  onDuplicate: (question: Question) => void;
};

/** Drag-to-reorder question list for a quiz. Extracted from quiz-bank/page.tsx (was 831
 * lines) to keep the page focused on state/composition. */
export function QuizQuestionList({ questions, onReorder, onEdit, onDelete, onDuplicate }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  return (
    <>
      {questions.length > 1 && (
        <p className="text-xs text-muted">Glissez-déposez pour réordonner les questions.</p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onReorder}>
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <SortableQuestionItem
                key={q.id}
                question={q}
                index={i}
                onEdit={() => onEdit(q)}
                onDelete={() => onDelete(q)}
                onDuplicate={() => onDuplicate(q)}
              />
            ))}
            {questions.length === 0 && (
              <li className="rounded-xl border border-dashed border-theme px-4 py-10 text-center text-sm text-muted">
                Aucune question — ajoutez la première pour ce quiz.
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}

function SortableQuestionItem({
  question: q,
  index: i,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <li ref={setNodeRef} style={style} className="card-theme rounded-xl px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 gap-2">
          <button
            type="button"
            className={`${btn.neutralXs} h-fit cursor-grab touch-none`}
            aria-label="Glisser pour réordonner"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="nav-group-label text-[11px] font-semibold uppercase tracking-wide">
              Q{i + 1} · {q.questionType}
            </p>
            <p className="mt-1 text-sm font-medium text-heading">{q.prompt}</p>
            {q.imageAssetId && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                <ImageIcon size={12} aria-hidden /> Image jointe
              </p>
            )}
            <ul className="mt-2 space-y-0.5">
              {q.options?.map((o) => (
                <li
                  key={o.id ?? o.label}
                  className={`flex items-center gap-1 text-xs ${o.correct ? "font-medium text-[var(--alert-success-fg)]" : "text-muted"}`}
                >
                  {o.correct ? <CheckCircle2 size={12} aria-hidden /> : <Circle size={12} aria-hidden />}
                  {o.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className={btn.icon}
            aria-label="Modifier"
            title="Modifier"
            onClick={onEdit}
          >
            <Pencil size={14} aria-hidden />
          </button>
          <button
            type="button"
            className={btn.icon}
            aria-label="Dupliquer"
            title="Dupliquer"
            onClick={onDuplicate}
          >
            <Copy size={14} aria-hidden />
          </button>
          <button
            type="button"
            className={btn.icon}
            aria-label="Supprimer"
            title="Supprimer"
            onClick={onDelete}
          >
            <Trash2 size={14} aria-hidden className="text-[var(--danger)]" />
          </button>
        </div>
      </div>
    </li>
  );
}
