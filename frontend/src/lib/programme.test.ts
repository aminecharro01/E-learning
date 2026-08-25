import { describe, expect, it } from "vitest";
import { filterByYear, groupUfs, moduleSelectGroups, yearLabel } from "./programme";
import type { Module } from "@/types/domain";

function makeModule(overrides: Partial<Module>): Module {
  return {
    id: overrides.id ?? "m1",
    code: null,
    title: overrides.title ?? "Module",
    description: null,
    orderIndex: overrides.orderIndex ?? 0,
    yearNumber: overrides.yearNumber ?? 1,
    ufCode: overrides.ufCode ?? null,
    ufTitle: overrides.ufTitle ?? null,
    published: true,
    ...overrides,
  };
}

describe("groupUfs", () => {
  it("groups modules by ufCode preserving first-seen order", () => {
    const modules = [
      makeModule({ id: "a", ufCode: "UF1", ufTitle: "Communication", orderIndex: 1 }),
      makeModule({ id: "b", ufCode: "UF2", ufTitle: "Anglais", orderIndex: 0 }),
      makeModule({ id: "c", ufCode: "UF1", ufTitle: "Communication", orderIndex: 0 }),
    ];

    const groups = groupUfs(modules);

    expect(groups.map((g) => g.ufCode)).toEqual(["UF1", "UF2"]);
    expect(groups[0].modules.map((m) => m.id)).toEqual(["c", "a"]); // sorted by orderIndex
  });

  it("falls back to a synthetic 'UF' key when ufCode is missing", () => {
    const modules = [makeModule({ id: "a", ufCode: null })];

    const groups = groupUfs(modules);

    expect(groups).toHaveLength(1);
    expect(groups[0].ufCode).toBe("UF");
  });

  it("returns an empty array for no modules", () => {
    expect(groupUfs([])).toEqual([]);
  });
});

describe("filterByYear", () => {
  it("defaults missing yearNumber to year 1", () => {
    const modules = [makeModule({ id: "a", yearNumber: null })];

    expect(filterByYear(modules, 1)).toHaveLength(1);
    expect(filterByYear(modules, 2)).toHaveLength(0);
  });

  it("filters strictly by the requested year", () => {
    const modules = [
      makeModule({ id: "a", yearNumber: 1 }),
      makeModule({ id: "b", yearNumber: 2 }),
    ];

    expect(filterByYear(modules, 2).map((m) => m.id)).toEqual(["b"]);
  });
});

describe("yearLabel", () => {
  it("labels year 2 distinctly from every other year", () => {
    expect(yearLabel(2)).toBe("2ème Année");
    expect(yearLabel(1)).toBe("1ère Année");
    expect(yearLabel(3)).toBe("1ère Année");
  });
});

describe("moduleSelectGroups", () => {
  it("builds one optgroup per UF per year, labeled with the year", () => {
    const modules = [
      makeModule({ id: "a", yearNumber: 1, ufCode: "UF1", ufTitle: "Communication" }),
      makeModule({ id: "b", yearNumber: 2, ufCode: "UF6", ufTitle: "Droit aérien" }),
    ];

    const groups = moduleSelectGroups(modules);

    expect(groups.map((g) => g.label)).toEqual([
      "1ère Année · Communication",
      "2ème Année · Droit aérien",
    ]);
  });
});
