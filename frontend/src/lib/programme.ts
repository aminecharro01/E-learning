import type { Module } from "@/types/domain";

export type UfGroup = {
  ufCode: string;
  ufTitle: string;
  modules: Module[];
};

/** Group modules by UF (preserves first-seen UF order). */
export function groupUfs(modules: Module[]): UfGroup[] {
  const ufMap = new Map<string, UfGroup>();
  for (const module of modules) {
    const ufKey = module.ufCode ?? "UF";
    if (!ufMap.has(ufKey)) {
      ufMap.set(ufKey, {
        ufCode: ufKey,
        ufTitle: module.ufTitle ?? ufKey,
        modules: [],
      });
    }
    ufMap.get(ufKey)!.modules.push(module);
  }
  return [...ufMap.values()].map((uf) => ({
    ...uf,
    modules: uf.modules.toSorted((a, b) => a.orderIndex - b.orderIndex),
  }));
}

export function filterByYear(modules: Module[], year: number): Module[] {
  return modules.filter((m) => (m.yearNumber ?? 1) === year);
}

export function yearLabel(year: number): string {
  return year === 2 ? "2ème Année" : "1ère Année";
}

/** Flat optgroups for admin selects: "Année X · UF title". */
export function moduleSelectGroups(modules: Module[]): { label: string; modules: Module[] }[] {
  const years = [1, 2] as const;
  const groups: { label: string; modules: Module[] }[] = [];
  for (const year of years) {
    const yearMods = filterByYear(modules, year);
    for (const uf of groupUfs(yearMods)) {
      groups.push({
        label: `${yearLabel(year)} · ${uf.ufTitle}`,
        modules: uf.modules,
      });
    }
  }
  return groups;
}
