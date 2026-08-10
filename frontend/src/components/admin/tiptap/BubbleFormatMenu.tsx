"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Link2 } from "lucide-react";
import { ToolBtn, Sep } from "@/components/admin/TipTapToolbar";

type Position = { top: number; left: number };

/**
 * Hand-rolled Medium/Notion-style floating toolbar for the current text
 * selection. Replaces `@tiptap/react/menus`'s BubbleMenu component, which
 * caused an unresolvable "Maximum update depth exceeded" loop in this app
 * regardless of prop stability — this version only ever touches React state
 * from a plain editor event listener, so there is no library-internal effect
 * chain that can feed back into itself.
 */
export function BubbleFormatMenu({ editor }: { editor: Editor }) {
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || !editor.isFocused) {
        setPosition(null);
        return;
      }
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      setPosition({
        top: Math.min(start.top, end.top),
        left: (start.left + end.left) / 2,
      });
    };
    const hide = () => setPosition(null);

    editor.on("selectionUpdate", updatePosition);
    editor.on("blur", hide);
    editor.on("destroy", hide);
    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("blur", hide);
      editor.off("destroy", hide);
    };
  }, [editor]);

  if (!position || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="tiptap-bubble-menu"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        transform: "translate(-50%, calc(-100% - 8px))",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <ToolBtn
        label="Gras (Ctrl+B)"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        label="Italique (Ctrl+I)"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        label="Souligné (Ctrl+U)"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        label="Barré"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        label="Code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-4 w-4" />
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
    </div>,
    document.body
  );
}
