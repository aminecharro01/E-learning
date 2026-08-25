import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeToasts, toast } from "./toast-store";

describe("toast-store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("notifies subscribers immediately with the current (empty) state", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);

    expect(listener).toHaveBeenCalledWith([]);
    unsubscribe();
  });

  it("pushing a toast notifies subscribers with the new list", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    listener.mockClear();

    toast.success("Enregistré");

    expect(listener).toHaveBeenCalledTimes(1);
    const [toasts] = listener.mock.calls[0];
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ variant: "success", message: "Enregistré" });

    unsubscribe();
    toast.dismiss(toasts[0].id);
  });

  it("auto-dismisses a toast after its duration elapses", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    listener.mockClear();

    toast.error("Erreur");
    const [toastsAfterPush] = listener.mock.calls[0];
    expect(toastsAfterPush).toHaveLength(1);

    vi.advanceTimersByTime(5000);

    const lastCall = listener.mock.calls.at(-1)!;
    expect(lastCall[0]).toEqual([]);

    unsubscribe();
  });

  it("dismiss removes only the targeted toast", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);

    toast.warning("A");
    toast.info("B");
    const idA = listener.mock.calls.at(-2)![0].at(-1).id;
    const idB = listener.mock.calls.at(-1)![0].at(-1).id;

    toast.dismiss(idA);
    const afterDismiss = listener.mock.calls.at(-1)![0];
    expect(afterDismiss).toHaveLength(1);
    expect(afterDismiss[0].id).toBe(idB);

    toast.dismiss(idB);
    unsubscribe();
  });

  it("unsubscribed listeners stop receiving updates", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    unsubscribe();
    listener.mockClear();

    toast.success("After unsubscribe");

    expect(listener).not.toHaveBeenCalled();
  });
});
