import type { Criterion, Deliverable, Project } from "../model/types";
import { nextId, renameId } from "./links";

/** The purpose: the one top item of the hierarchy (stored as the only goal). */
export const purposeOf = (p: Project) => p.goals[0];

/** Goals are no longer a level of their own: there is one purpose, measured
 *  by success criteria. Older projects had sub-goals; each becomes a success
 *  criterion (keeping its ID references), and the criteria that measured it
 *  become its sub-criteria. Safe to run on every load. */
export function flattenGoals(p: Project) {
  if (p.goals.length <= 1) { if (p.goals[0]) delete p.goals[0].parent; return; }
  const ids = new Set(p.goals.map((g) => g.id));
  const top = p.goals.find((g) => !g.parent || !ids.has(g.parent)) ?? p.goals[0];
  const moved = new Map<string, string>();
  for (const g of p.goals.filter((x) => x !== top)) {
    const to = nextId(p, "criteria");
    // Reserve the new ID before renaming, so the next one is different.
    p.criteria.push({ id: to, title: "", target: "", status: "Draft", serves: [], owners: [], links: [] });
    renameId(p, g.id, to);
    moved.set(to, g.id);
  }
  // renameId changed the goal's own ID and every reference; now move each
  // renamed goal into the placeholder criterion.
  for (const [to] of moved) {
    const g = p.goals.find((x) => x.id === to)!;
    const c = p.criteria.find((x) => x.id === to)!;
    Object.assign(c, { title: g.title, links: g.links, ...(g.notes ? { notes: g.notes } : {}), ...(g.parent && g.parent !== top.id ? { parent: g.parent } : {}) });
  }
  p.goals = [top];
  delete top.parent;
  // Criteria that measured a former goal now sit under it.
  for (const c of p.criteria) {
    if (moved.has(c.id)) continue;
    const former = c.serves.find((s) => moved.has(s));
    if (former && !c.parent) c.parent = former;
  }
  syncPurpose(p);
}

/** Top-level success criteria measure the purpose; sub-criteria count
 *  through their parent. Keeps the stored links in line with the diagram. */
export function syncPurpose(p: Project) {
  const top = purposeOf(p);
  const ids = new Set(p.criteria.map((c) => c.id));
  for (const c of p.criteria) {
    const isTop = !c.parent || !ids.has(c.parent) || c.parent === c.id;
    c.serves = isTop && top ? [top.id] : [];
  }
}

type Tree = { id: string; parent?: string };
/** Is `a` the same as `b` or somewhere below it? */
export function isUnder<T extends Tree>(list: T[], a: string, b: string): boolean {
  let cur: string | undefined = a;
  for (let i = 0; cur && i < 50; i++) { if (cur === b) return true; cur = list.find((x) => x.id === cur)?.parent; }
  return false;
}

export type Place = { kind: "before" | "after"; target: string } | { kind: "into"; target: string } | { kind: "top" };
/** Move an item within its level: next to another item (as its sibling), into
 *  another item (as its last sub-item) or to the top level. The order of the
 *  list is the order in the diagram. Returns false if the move is not allowed
 *  (an item cannot go below itself). */
export function placeItem<T extends Tree>(list: T[], id: string, to: Place): boolean {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return false;
  if (to.kind !== "top" && (to.target === id || isUnder(list, to.target, id))) return false;
  const [it] = list.splice(i, 1);
  if (to.kind === "top") { delete it.parent; list.push(it); return true; }
  const t = list.findIndex((x) => x.id === to.target);
  if (to.kind === "into") { it.parent = to.target; list.push(it); return true; }
  const parent = list[t].parent;
  if (parent) it.parent = parent; else delete it.parent;
  list.splice(to.kind === "before" ? t : t + 1, 0, it);
  return true;
}

/** Swap an item with its previous or next sibling. */
export function shiftItem<T extends Tree>(list: T[], id: string, dir: -1 | 1): boolean {
  const it = list.find((x) => x.id === id);
  if (!it) return false;
  const ids = new Set(list.map((x) => x.id));
  const par = (x: T) => (x.parent && ids.has(x.parent) ? x.parent : undefined);
  const sib = list.filter((x) => par(x) === par(it));
  const k = sib.indexOf(it) + dir;
  if (k < 0 || k >= sib.length) return false;
  const a = list.indexOf(it), b = list.indexOf(sib[k]);
  [list[a], list[b]] = [list[b], list[a]];
  return true;
}

/** Tidy the diagram: deliverables follow the order of the criteria they
 *  count towards, so lines cross as little as possible. */
export function tidy(p: Project) {
  const order = new Map<string, number>();
  let n = 0;
  const walk = (list: Criterion[], parent?: string) => list.filter((c) => c.parent === parent).forEach((c) => { order.set(c.id, n++); walk(list, c.id); });
  walk(p.criteria);
  const rank = (d: Deliverable) => Math.min(...d.serves.map((s) => order.get(s) ?? 999), 999);
  p.deliverables = p.deliverables.map((d, i) => ({ d, i })).sort((a, b) => rank(a.d) - rank(b.d) || a.i - b.i).map((x) => x.d);
}
