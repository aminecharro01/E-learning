"use client";

import { useEffect, useState } from "react";
import { listConversations } from "@/lib/api";

const POLL_MS = 20_000;

/** Total unread messages across every conversation — polled for the header/sidebar badges,
 * shared between the learner and staff shells so neither has to open the messagerie to know. */
export function useUnreadMessagesCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const conversations = await listConversations();
        if (!cancelled) setCount(conversations.reduce((sum, c) => sum + c.unreadCount, 0));
      } catch {
        // silencieux — le prochain polling réessaiera
      }
    }

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return count;
}
