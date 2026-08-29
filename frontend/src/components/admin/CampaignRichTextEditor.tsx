"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useMemo } from "react";
import { Bold, Italic, Link2, List, ListOrdered, Image as ImageIcon, Redo2, Underline as UnderlineIcon, Undo2 } from "lucide-react";
import { ToolBtn, Sep } from "@/components/admin/TipTapToolbar";

// Same stable-reference requirement as the lesson block editor (BlockEditor.tsx) — a
// fresh object here on every render breaks TipTap's internal option comparison.
const editorProps = {
  attributes: {
    class: "tiptap tiptap-editor min-h-[160px] px-3 py-3 focus:outline-none",
  },
};

type Props = {
  value: string;
  onChange: (html: string) => void;
};

/** Minimal WYSIWYG for campaign emails — bold/italic/underline/lien/listes/image,
 *  deliberately without the lesson editor's video embed or slash commands (neither
 *  makes sense in an email body). Replaces the raw HTML textarea. */
export function CampaignRichTextEditor({ value, onChange }: Props) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline" },
        },
      }),
      Underline,
      Placeholder.configure({ placeholder: "Contenu de l'email…" }),
    ],
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value || "<p></p>",
    editorProps,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className="editor-panel">
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-theme bg-surface-2 px-2 py-1.5"
        onMouseDown={(e) => e.preventDefault()}
      >
        <ToolBtn
          label="Annuler"
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label="Rétablir"
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolBtn>
        <Sep />
        <ToolBtn label="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn label="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn label="Souligné" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <Sep />
        <ToolBtn label="Liste à puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn label="Liste numérotée" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
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
            const url = window.prompt("URL du lien", "https://");
            if (!url) return;
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
        >
          <Link2 className="h-4 w-4" />
        </ToolBtn>
        <label className="toolbar-label" title="Insérer une image">
          <ImageIcon className="h-4 w-4" />
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
                editor.chain().focus().insertContent(`<img src="${url}" alt="${file.name.replace(/"/g, "")}" />`).run();
              } catch {
                window.alert("Impossible d'envoyer l'image.");
              }
            }}
          />
        </label>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
