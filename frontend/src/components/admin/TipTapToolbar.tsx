"use client";

import { useEffect, useReducer, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";

type Props = {
  editor: Editor | null;
};

function ToolBtn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Critical: avoid stealing focus / clearing selection before the command runs
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold transition disabled:opacity-40 ${
        active
          ? "nav-item-active bg-primary text-[var(--primary-fg)]"
          : "text-body hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-[var(--border)]" aria-hidden />;
}

/**
 * TipTap v3 toolbar — follows official docs:
 * https://tiptap.dev/docs/editor/extensions/nodes/heading
 * Commands: chain().focus().toggleHeading({ level }).run()
 */
export function TipTapToolbar({ editor }: Props) {
  const [, bump] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!editor) return;
    // Keep button active states in sync with selection (backup if shouldRerenderOnTransaction is off)
    const refresh = () => bump();
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-theme bg-surface-2 px-2 py-1.5"
      // Keep caret in the editor when interacting with the toolbar
      onMouseDown={(e) => e.preventDefault()}
    >
      <ToolBtn
        label="Annuler (Ctrl+Z)"
        disabled={!editor.can().chain().focus().undo().run()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↶
      </ToolBtn>
      <ToolBtn
        label="Rétablir (Ctrl+Y)"
        disabled={!editor.can().chain().focus().redo().run()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↷
      </ToolBtn>

      <Sep />

      <ToolBtn
        label="Paragraphe"
        active={editor.isActive("paragraph") && !editor.isActive("heading")}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        P
      </ToolBtn>
      <ToolBtn
        label="Titre 1 (Ctrl+Alt+1)"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolBtn>
      <ToolBtn
        label="Titre 2 (Ctrl+Alt+2)"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolBtn>
      <ToolBtn
        label="Titre 3 (Ctrl+Alt+3)"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolBtn>

      <Sep />

      <ToolBtn
        label="Gras (Ctrl+B)"
        active={editor.isActive("bold")}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolBtn>
      <ToolBtn
        label="Italique (Ctrl+I)"
        active={editor.isActive("italic")}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </ToolBtn>
      <ToolBtn
        label="Souligné (Ctrl+U)"
        active={editor.isActive("underline")}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolBtn>
      <ToolBtn
        label="Barré"
        active={editor.isActive("strike")}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolBtn>
      <ToolBtn
        label="Code"
        active={editor.isActive("code")}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        {"</>"}
      </ToolBtn>

      <Sep />

      <ToolBtn
        label="Liste à puces"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        ••
      </ToolBtn>
      <ToolBtn
        label="Liste numérotée"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolBtn>
      <ToolBtn
        label="Citation"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        “”
      </ToolBtn>
      <ToolBtn
        label="Ligne horizontale"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        ―
      </ToolBtn>

      <Sep />

      <ToolBtn
        label="Aligner à gauche"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        G
      </ToolBtn>
      <ToolBtn
        label="Centrer"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        C
      </ToolBtn>
      <ToolBtn
        label="Aligner à droite"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        D
      </ToolBtn>

      <Sep />

      <ToolBtn
        label="Lien"
        active={editor.isActive("link")}
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const previous = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("URL du lien", previous || "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        Lien
      </ToolBtn>

      <Sep />

      <label
        className="toolbar-label"
        title="Insérer une image"
      >
        Image
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const { uploadMedia, resolveAssetUrl } = await import("@/lib/media");
              const asset = await uploadMedia(file, "IMAGE");
              const url = await resolveAssetUrl(asset.id);
              const alt = file.name.replace(/"/g, "");
              editor
                .chain()
                .focus()
                .insertContent(
                  `<img src="${url}" alt="${alt}" data-asset-id="${asset.id}" class="tiptap-image" />`
                )
                .run();
            } catch {
              window.alert("Impossible d’envoyer l’image.");
            }
          }}
        />
      </label>

      <label
        className="toolbar-label"
        title="Insérer une vidéo"
      >
        Vidéo
        <input
          type="file"
          accept="video/*,.m3u8"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const { uploadMedia, resolveAssetUrl } = await import("@/lib/media");
              const asset = await uploadMedia(file, "VIDEO");
              const url = await resolveAssetUrl(asset.id);
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "videoEmbed",
                  attrs: {
                    src: url,
                    controls: true,
                    "data-asset-id": asset.id,
                  },
                })
                .run();
            } catch {
              window.alert("Impossible d’envoyer la vidéo.");
            }
          }}
        />
      </label>

      <ToolBtn
        label="Effacer le formatage"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        Effacer
      </ToolBtn>
    </div>
  );
}
