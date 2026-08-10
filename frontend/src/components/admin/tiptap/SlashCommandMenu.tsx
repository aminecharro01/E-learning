"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import type { Editor, Range } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";

export type SlashCommandItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  command: (props: { editor: Editor; range: Range }) => void;
};

export type SlashCommandMenuRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

export const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SuggestionProps<SlashCommandItem>>(
  (props, ref) => {
    const [selected, setSelected] = useState(0);
    const items = props.items;

    useEffect(() => {
      setSelected(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false;
        if (event.key === "ArrowDown") {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelected((s) => (s - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          const item = items[selected];
          if (item) props.command(item);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="slash-menu">
          <p className="slash-menu-empty">Aucune commande trouvée</p>
        </div>
      );
    }

    return (
      <div className="slash-menu" role="listbox">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              role="option"
              aria-selected={i === selected}
              className={`slash-menu-item ${i === selected ? "is-selected" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => props.command(item)}
              onMouseEnter={() => setSelected(i)}
            >
              <span className="slash-menu-icon" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <span className="slash-menu-copy">
                <span className="slash-menu-title">{item.title}</span>
                <span className="slash-menu-desc">{item.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }
);
SlashCommandMenu.displayName = "SlashCommandMenu";
