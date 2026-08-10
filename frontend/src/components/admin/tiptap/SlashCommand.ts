import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import type { Editor, Range } from "@tiptap/core";
import {
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { SlashCommandMenu, type SlashCommandItem, type SlashCommandMenuRef } from "./SlashCommandMenu";

function pickAndUpload(kind: "IMAGE" | "VIDEO", editor: Editor, range: Range) {
  editor.chain().focus().deleteRange(range).run();
  const input = document.createElement("input");
  input.type = "file";
  input.accept = kind === "IMAGE" ? "image/*" : "video/*,.m3u8";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const { uploadMedia, resolveAssetUrl } = await import("@/lib/media");
      const asset = await uploadMedia(file, kind);
      const url = await resolveAssetUrl(asset.id);
      if (kind === "IMAGE") {
        const alt = file.name.replace(/"/g, "");
        editor
          .chain()
          .focus()
          .insertContent(`<img src="${url}" alt="${alt}" data-asset-id="${asset.id}" class="tiptap-image" />`)
          .run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "videoEmbed",
            attrs: { src: url, controls: true, "data-asset-id": asset.id },
          })
          .run();
      }
    } catch {
      window.alert(kind === "IMAGE" ? "Impossible d'envoyer l'image." : "Impossible d'envoyer la vidéo.");
    }
  };
  input.click();
}

const ITEMS: SlashCommandItem[] = [
  {
    title: "Paragraphe",
    description: "Texte simple",
    icon: Pilcrow,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Titre 1",
    description: "Grand titre de section",
    icon: Heading1,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Titre 2",
    description: "Titre moyen",
    icon: Heading2,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Titre 3",
    description: "Petit titre",
    icon: Heading3,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Liste à puces",
    description: "Liste non ordonnée",
    icon: List,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Liste numérotée",
    description: "Liste ordonnée",
    icon: ListOrdered,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Citation",
    description: "Bloc de citation",
    icon: Quote,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Ligne horizontale",
    description: "Séparateur",
    icon: Minus,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Image",
    description: "Envoyer une image",
    icon: ImageIcon,
    command: ({ editor, range }) => pickAndUpload("IMAGE", editor, range),
  },
  {
    title: "Vidéo",
    description: "Envoyer une vidéo",
    icon: Video,
    command: ({ editor, range }) => pickAndUpload("VIDEO", editor, range),
  },
];

function filterItems(query: string): SlashCommandItem[] {
  if (!query) return ITEMS;
  const q = query.toLowerCase();
  return ITEMS.filter(
    (item) => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
  );
}

/**
 * Notion-style "/" command menu — types trigger a filtered dropdown of block
 * inserts instead of requiring the toolbar for every structural change.
 */
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        allowSpaces: false,
        items: ({ query }) => filterItems(query).slice(0, 10),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<SlashCommandMenuRef>;
          let unmount: (() => void) | undefined;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandMenu, {
                props,
                editor: props.editor,
              });
              if (!props.clientRect) return;
              unmount = props.mount(component.element);
            },
            onUpdate(props) {
              component.updateProps(props);
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                unmount?.();
                return true;
              }
              return component.ref?.onKeyDown(props) ?? false;
            },
            onExit() {
              unmount?.();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
