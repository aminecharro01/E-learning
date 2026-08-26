"use client";

// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard
// Modified: reconnected to Spring Boot API, removed mock data, added role-based rendering

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import CharacterCount from "@tiptap/extension-character-count";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState, useRef } from "react";
import { GripVertical } from "lucide-react";
import apiClient from "@/lib/api-client";
import { TipTapToolbar } from "@/components/admin/TipTapToolbar";
import { VideoEmbed } from "@/components/admin/tiptap/VideoEmbed";
import { SlashCommand } from "@/components/admin/tiptap/SlashCommand";
import { BubbleFormatMenu } from "@/components/admin/tiptap/BubbleFormatMenu";
import { useResolveMediaAssets } from "@/lib/media";
import { VideoPlayer } from "@/components/VideoPlayer";
import { PdfViewer } from "@/components/PdfViewer";
import { AssetImage } from "@/components/AssetImage";
import { btn } from "@/lib/ui";

// Must be a stable reference: a fresh object literal passed to `useEditor`'s
// `editorProps` on every render makes Tiptap's internal `compareOptions` check
// fail every time (combined with `shouldRerenderOnTransaction`, this forced a
// repeated `editor.setOptions()` call that triggered infinite re-renders).
const textEditorProps = {
  attributes: {
    class: "tiptap tiptap-editor min-h-[160px] px-3 py-3 focus:outline-none",
  },
};

export type BlockItem = {
  id: string;
  blockType: "VIDEO" | "TEXT" | "PDF" | "IMAGE";
  content: Record<string, unknown>;
  orderIndex: number;
};

type Props = {
  lessonId: string;
  initialBlocks: BlockItem[];
  onChange?: (blocks: BlockItem[]) => void;
};

function TextBlockEditor({
  block,
  onUpdateText,
}: {
  block: BlockItem;
  onUpdateText: (id: string, text: string) => void;
}) {
  const initialHtml = String(block.content.body ?? block.content.text ?? "<p></p>");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Must be memoized: TipTap's useEditor compares extension instances by
  // reference on every render (see textEditorProps comment above for the
  // full failure mode) — a fresh array of freshly `.configure()`d extensions
  // every render defeats that check just as badly as a fresh editorProps object.
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: "tiptap-heading",
          },
        },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline",
          },
        },
      }),
      Placeholder.configure({
        placeholder: "Saisissez le contenu… tapez « / » pour insérer un bloc.",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            "data-asset-id": {
              default: null,
              parseHTML: (element) => element.getAttribute("data-asset-id"),
              renderHTML: (attributes) => {
                if (!attributes["data-asset-id"]) return {};
                return { "data-asset-id": attributes["data-asset-id"] };
              },
            },
          };
        },
      }),
      VideoEmbed,
      CharacterCount,
      SlashCommand,
    ],
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions,
    content: initialHtml,
    editorProps: textEditorProps,
    onBlur: ({ editor: ed }) => {
      onUpdateText(block.id, ed.getHTML());
    },
  });

  useResolveMediaAssets(wrapRef, initialHtml);

  const words = editor?.storage.characterCount?.words() ?? 0;
  const characters = editor?.storage.characterCount?.characters() ?? 0;

  return (
    <div ref={wrapRef} className="editor-panel">
      <TipTapToolbar editor={editor} />
      {editor && <BubbleFormatMenu editor={editor} />}
      <EditorContent editor={editor} />
      <p className="flex items-center justify-between border-t border-theme px-3 py-1.5 text-[11px] text-muted">
        <span>« / » pour insérer un bloc · sauvegarde au blur</span>
        <span>
          {words} mot{words > 1 ? "s" : ""} · {characters} caractères
        </span>
      </p>
    </div>
  );
}

function SortableBlock({
  block,
  onUpdateText,
  onToggleRequired,
  onDelete,
}: {
  block: BlockItem;
  onUpdateText: (id: string, text: string) => void;
  onToggleRequired: (id: string, required: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: block.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="card-theme rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          className={`${btn.neutralXs} cursor-grab`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} aria-hidden /> {block.blockType}
        </button>
        <button
          type="button"
          onClick={() => onDelete(block.id)}
          className="text-xs text-[var(--danger)] hover:underline"
        >
          Supprimer
        </button>
      </div>

      {block.blockType === "TEXT" && (
        <TextBlockEditor block={block} onUpdateText={onUpdateText} />
      )}
      {block.blockType === "VIDEO" &&
        (block.content.assetId ? (
          <VideoPlayer
            assetId={String(block.content.assetId)}
            title={String(block.content.title ?? "")}
          />
        ) : (
          <p className="text-sm text-muted">Aucune vidéo.</p>
        ))}
      {block.blockType === "PDF" &&
        (block.content.assetId ? (
          <div className="space-y-2">
            <PdfViewer assetId={String(block.content.assetId)} title={String(block.content.title ?? "")} />
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={block.content.required !== false}
                onChange={(e) => void onToggleRequired(block.id, e.target.checked)}
              />
              Obligatoire (téléchargement requis pour continuer)
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted">Aucun document.</p>
        ))}
      {block.blockType === "IMAGE" &&
        (block.content.assetId ? (
          <AssetImage
            assetId={String(block.content.assetId)}
            alt={String(block.content.alt ?? "")}
            className="max-h-80 w-auto rounded-lg border border-theme"
          />
        ) : (
          <p className="text-sm text-muted">Aucune image.</p>
        ))}
    </div>
  );
}

export function BlockEditor({ lessonId, initialBlocks, onChange }: Props) {
  const [blocks, setBlocks] = useState<BlockItem[]>(initialBlocks);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  function emit(next: BlockItem[]) {
    setBlocks(next);
    onChange?.(next);
  }

  async function persistReorder(next: BlockItem[]) {
    setBusy(true);
    try {
      const payload = next.map((b, i) => ({ id: b.id, orderIndex: i }));
      const { data } = await apiClient.patch<BlockItem[]>(
        `/api/lessons/${lessonId}/blocks`,
        payload
      );
      emit(data);
      setMessage("Ordre enregistré.");
    } catch {
      setMessage("Échec du réordonnancement (verrou ?).");
    } finally {
      setBusy(false);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const next = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
      ...b,
      orderIndex: i,
    }));
    emit(next);
    void persistReorder(next);
  }

  async function addTextBlock() {
    setBusy(true);
    try {
      const { data } = await apiClient.post<BlockItem>(`/api/lessons/${lessonId}/blocks`, {
        blockType: "TEXT",
        content: { body: "<p></p>" },
        orderIndex: blocks.length,
      });
      emit([...blocks, data]);
      setMessage("Bloc texte ajouté — utilisez la barre d’outils TipTap.");
    } catch {
      setMessage("Impossible d'ajouter le bloc (verrou ?).");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAndAdd(kind: "VIDEO" | "PDF" | "IMAGE", file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const { data: asset } = await apiClient.post<{ id: string }>("/api/assets/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { data: block } = await apiClient.post<BlockItem>(`/api/lessons/${lessonId}/blocks`, {
        blockType: kind,
        content: {
          assetId: asset.id,
          title: file.name,
          alt: file.name,
          ...(kind === "PDF" ? { required: true } : {}),
        },
        orderIndex: blocks.length,
      });
      emit([...blocks, block]);
    } catch {
      setMessage("Ajout de bloc impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onUpdateText(id: string, html: string) {
    try {
      await apiClient.put(`/api/lessons/${lessonId}/blocks/${id}`, {
        content: { body: html },
      });
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content: { ...b.content, body: html } } : b))
      );
    } catch {
      setMessage("Échec de sauvegarde du texte.");
    }
  }

  async function onToggleRequired(id: string, required: boolean) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    try {
      await apiClient.put(`/api/lessons/${lessonId}/blocks/${id}`, {
        content: { ...block.content, required },
      });
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content: { ...b.content, required } } : b))
      );
    } catch {
      setMessage("Échec de mise à jour.");
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    try {
      await apiClient.delete(`/api/lessons/${lessonId}/blocks/${id}`);
      emit(blocks.filter((b) => b.id !== id));
    } catch {
      setMessage("Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  const uploadLabelClass = `${btn.neutralSm} cursor-pointer`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void addTextBlock()}
          className={btn.primary}
        >
          + Texte (TipTap)
        </button>
        <label className={uploadLabelClass}>
          + Vidéo
          <input
            type="file"
            accept="video/*,.m3u8"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAndAdd("VIDEO", f);
            }}
          />
        </label>
        <label className={uploadLabelClass}>
          + PDF
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAndAdd("PDF", f);
            }}
          />
        </label>
        <label className={uploadLabelClass}>
          + Image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAndAdd("IMAGE", f);
            }}
          />
        </label>
      </div>

      {message && <p className="text-sm text-muted">{message}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                onUpdateText={onUpdateText}
                onToggleRequired={onToggleRequired}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-theme p-6 text-center text-sm text-muted">
          Aucun bloc — ajoutez du texte TipTap, ou uploadez directement une vidéo / PDF / image
          (insertion immédiate dans la section).
        </p>
      )}
    </div>
  );
}
