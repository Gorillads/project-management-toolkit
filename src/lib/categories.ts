import type { Project } from "../model/types";

/** The three user-editable category lists, and which field on which items
 *  holds the value. "" means "no group". */
export type CatKind = "pGroups" | "sCats" | "rCats";
const FIELD = { pGroups: ["people", "group"], sCats: ["stakeholders", "cat"], rCats: ["risks", "cat"] } as const;

const itemsOf = (p: Project, kind: CatKind) => p[FIELD[kind][0]] as unknown as Record<string, unknown>[];
export const usedBy = (p: Project, kind: CatKind, name: string) => itemsOf(p, kind).filter((x) => x[FIELD[kind][1]] === name).length;

export function addCat(p: Project, kind: CatKind, name: string): boolean {
  const n = name.trim();
  if (!n || p[kind].some((c) => c.toLowerCase() === n.toLowerCase())) return false;
  p[kind].push(n);
  if (kind === "rCats") p.lenses.forEach((l) => { if (!l.cats.includes(n)) l.cats.push(n); });
  return true;
}

/** Rename everywhere the name is used: the list, the items and the filters. */
export function renameCat(p: Project, kind: CatKind, from: string, to: string): boolean {
  const n = to.trim();
  if (!n || n === from) return false;
  if (p[kind].some((c) => c !== from && c.toLowerCase() === n.toLowerCase())) return false;
  p[kind] = p[kind].map((c) => (c === from ? n : c));
  const f = FIELD[kind][1];
  itemsOf(p, kind).forEach((x) => { if (x[f] === from) x[f] = n; });
  if (kind === "rCats") p.lenses.forEach((l) => { l.cats = l.cats.map((c) => (c === from ? n : c)); });
  if (kind === "sCats") p.lenses.forEach((l) => { if (l.sCat === from) l.sCat = n; });
  return true;
}

/** Remove from the list; items in it are kept, just without a group. */
export function removeCat(p: Project, kind: CatKind, name: string) {
  p[kind] = p[kind].filter((c) => c !== name);
  const f = FIELD[kind][1];
  itemsOf(p, kind).forEach((x) => { if (x[f] === name) x[f] = ""; });
  if (kind === "rCats") p.lenses.forEach((l) => { if (l.cats.includes(name)) l.cats = [...l.cats.filter((c) => c !== name), ...(l.cats.includes("") ? [] : [""])]; });
  if (kind === "sCats") p.lenses.forEach((l) => { if (l.sCat === name) l.sCat = ""; });
}

export function moveCat(p: Project, kind: CatKind, name: string, dir: -1 | 1) {
  const i = p[kind].indexOf(name), j = i + dir;
  if (i < 0 || j < 0 || j >= p[kind].length) return;
  [p[kind][i], p[kind][j]] = [p[kind][j], p[kind][i]];
}

/** Every value in use is also in its list, so nothing is hidden. */
export function syncCats(p: Project) {
  for (const kind of ["pGroups", "sCats", "rCats"] as CatKind[]) {
    const f = FIELD[kind][1];
    for (const x of itemsOf(p, kind)) { const v = x[f]; if (typeof v === "string" && v && !p[kind].includes(v)) p[kind].push(v); }
  }
}
