import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuizAttemptReview } from "./QuizAttemptReview";
import { getAttemptReview, type AttemptReview } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";

vi.mock("@/lib/api", () => ({
  getAttemptReview: vi.fn(),
}));

const mockedGetAttemptReview = vi.mocked(getAttemptReview);

function baseReview(overrides: Partial<AttemptReview> = {}): AttemptReview {
  return {
    attemptId: "attempt-1",
    score: 50,
    passingScore: 60,
    status: "FAILED",
    questions: [],
    ...overrides,
  };
}

describe("QuizAttemptReview", () => {
  it("shows the correct option in green and the learner's wrong pick in red", async () => {
    mockedGetAttemptReview.mockResolvedValue(
      baseReview({
        questions: [
          {
            questionId: "q1",
            prompt: "2 + 2 = ?",
            questionType: "SINGLE_CHOICE",
            options: [
              { optionId: "o1", label: "3", correct: false, selected: true },
              { optionId: "o2", label: "4", correct: true, selected: false },
            ],
            freeTextAnswer: null,
            correct: false,
            essayScore: null,
            essayFeedback: null,
            explanation: null,
          },
        ],
      })
    );

    render(<QuizAttemptReview attemptId="attempt-1" />);

    const wrongOption = await screen.findByText("3");
    const correctOption = await screen.findByText("4");

    expect(wrongOption.closest("li")).toHaveClass("border-[var(--danger)]");
    expect(correctOption.closest("li")).toHaveClass("border-[var(--success)]");
  });

  it("renders essay answers with a pending-review note when not yet graded", async () => {
    mockedGetAttemptReview.mockResolvedValue(
      baseReview({
        questions: [
          {
            questionId: "q2",
            prompt: "Expliquez la règle des 3C.",
            questionType: "ESSAY",
            options: [],
            freeTextAnswer: "Clair, concis, courtois.",
            correct: null,
            essayScore: null,
            essayFeedback: null,
            explanation: null,
          },
        ],
      })
    );

    render(<QuizAttemptReview attemptId="attempt-1" />);

    expect(await screen.findByText("Clair, concis, courtois.")).toBeInTheDocument();
    expect(screen.getByText("En attente de correction.")).toBeInTheDocument();
  });

  it("shows a fallback message when the review fails to load", async () => {
    mockedGetAttemptReview.mockRejectedValue(new ApiClientError(403, "Accès refusé."));

    render(<QuizAttemptReview attemptId="attempt-1" />);

    expect(await screen.findByText("Accès refusé.")).toBeInTheDocument();
  });

  it("shows the explanation text when provided", async () => {
    mockedGetAttemptReview.mockResolvedValue(
      baseReview({
        questions: [
          {
            questionId: "q3",
            prompt: "Question avec explication",
            questionType: "SINGLE_CHOICE",
            options: [{ optionId: "o1", label: "Réponse", correct: true, selected: true }],
            freeTextAnswer: null,
            correct: true,
            essayScore: null,
            essayFeedback: null,
            explanation: "Voir le chapitre 2.",
          },
        ],
      })
    );

    render(<QuizAttemptReview attemptId="attempt-1" />);

    expect(await screen.findByText("Voir le chapitre 2.")).toBeInTheDocument();
  });
});
