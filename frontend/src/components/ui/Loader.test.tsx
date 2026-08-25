import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Loader, PageLoader } from "./Loader";

describe("Loader", () => {
  it("defaults to medium size and brand tone", () => {
    const { container } = render(<Loader />);
    const el = container.firstElementChild as HTMLElement;

    expect(el).toHaveClass("loader-ring--brand");
    expect(el.style.width).toBe("32px");
    expect(el.style.height).toBe("32px");
  });

  it("applies the requested size and tone", () => {
    const { container } = render(<Loader size="lg" tone="current" />);
    const el = container.firstElementChild as HTMLElement;

    expect(el).toHaveClass("loader-ring--current");
    expect(el.style.width).toBe("52px");
  });

  it("is purely decorative (aria-hidden)", () => {
    const { container } = render(<Loader />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("PageLoader", () => {
  it("renders a default French loading label with an accessible status role", () => {
    render(<PageLoader />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
  });

  it("renders a custom label when provided", () => {
    render(<PageLoader label="Préparation du quiz…" />);
    expect(screen.getByText("Préparation du quiz…")).toBeInTheDocument();
  });
});
