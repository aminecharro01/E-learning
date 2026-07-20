import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Inline / block video for TipTap (HTML5 <video controls>).
 * Persists data-asset-id so the learner view can resolve a signed stream URL.
 */
export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      "data-asset-id": { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "video" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: "true",
        class: "tiptap-video",
      }),
    ];
  },
});
