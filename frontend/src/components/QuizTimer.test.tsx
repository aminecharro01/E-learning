import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { QuizTimer } from "./QuizTimer";

describe("QuizTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows 'Temps illimité' when there is no expiry", () => {
    render(<QuizTimer expiresAt={null} />);
    expect(screen.getByText("Temps illimité")).toBeInTheDocument();
  });

  it("counts down mm:ss from a future expiry", () => {
    const expiresAt = new Date("2026-01-01T00:05:00Z").toISOString();
    render(<QuizTimer expiresAt={expiresAt} />);

    expect(screen.getByText("05:00")).toBeInTheDocument();
  });

  it("ticks down every second", () => {
    const expiresAt = new Date("2026-01-01T00:00:10Z").toISOString();
    render(<QuizTimer expiresAt={expiresAt} />);
    expect(screen.getByText("00:10")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("00:07")).toBeInTheDocument();
  });

  it("marks the badge urgent once at or below 60 seconds remain", () => {
    const expiresAt = new Date("2026-01-01T00:00:45Z").toISOString();
    render(<QuizTimer expiresAt={expiresAt} />);

    expect(screen.getByText("00:45")).toHaveClass("timer-badge-urgent");
  });

  it("is not urgent with more than 60 seconds remaining", () => {
    const expiresAt = new Date("2026-01-01T00:05:00Z").toISOString();
    render(<QuizTimer expiresAt={expiresAt} />);

    expect(screen.getByText("05:00")).not.toHaveClass("timer-badge-urgent");
  });

  it("calls onExpire once the countdown reaches zero", () => {
    const onExpire = vi.fn();
    const expiresAt = new Date("2026-01-01T00:00:02Z").toISOString();
    render(<QuizTimer expiresAt={expiresAt} onExpire={onExpire} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onExpire).toHaveBeenCalled();
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });
});
