"use client";

import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { MessagingConsole } from "@/components/messaging/MessagingConsole";

export default function MessagesPage() {
  return (
    <div className="min-h-screen">
      <LearnerAppHeader showParcoursLink />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <MessagingConsole />
      </div>
    </div>
  );
}
