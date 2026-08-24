"use client";

import { LearnerAppHeader } from "@/components/learner/LearnerAppHeader";
import { MessagingConsole } from "@/components/messaging/MessagingConsole";

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <LearnerAppHeader showParcoursLink />
      <div className="mt-4">
        <MessagingConsole />
      </div>
    </div>
  );
}
