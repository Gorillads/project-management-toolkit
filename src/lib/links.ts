import type { AnyItem, CollKey, Lang, Project, Risk } from "../model/types";
import { COLL_PREFIX, PREFIX } from "../data/catalog";

export const COLLS: CollKey[] = ["stakeholders", "people", "risks", "issues", "decisions", "assumptions", "changes", "milestones", "tasks", "benefits", "lessons", "wbs"];
export const typeOf = (id: string) => id.replace(/\d+$/, "");

export interface Index {
  all: Map<string, { id: string; title: string; coll: CollKey; item: AnyItem }>;
  refs: Map<string, Set<string>>;
}
const cache = new WeakMap<Project, Index>();

/** Every link in a project is stored once (on the item that names it) and
 *  read both ways through this index, so backlinks never drift. */
export function indexOf(p: Project): Index {
  const hit = cache.get(p);
  if (hit) return hit;
  const all: Index["all"] = new Map();
  const refs: Index["refs"] = new Map();
  for (const c of COLLS) for (const it of p[c] as AnyItem[]) all.set(it.id, { id: it.id, title: it.title, coll: c, item: it });
  const add = (a: string, b: string) => {
    if (!a || !b || a === b || !all.has(a) || !all.has(b)) return;
    if (!refs.has(a)) refs.set(a, new Set());
    if (!refs.has(b)) refs.set(b, new Set());
    refs.get(a)!.add(b);
    refs.get(b)!.add(a);
  };
  for (const { id, item } of all.values()) {
    for (const l of item.links) add(id, l);
    const it = item as unknown as Record<string, unknown>;
    for (const k of ["owner", "by", "from", "stakeholder"]) if (typeof it[k] === "string") add(id, it[k] as string);
  }
  const idx = { all, refs };
  cache.set(p, idx);
  return idx;
}
const byNum = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
export const refsOf = (p: Project, id: string, type?: string) =>
  [...(indexOf(p).refs.get(id) ?? [])].filter((x) => !type || typeOf(x) === type).sort(byNum);
export const titleOf = (p: Project, id?: string) => (id ? indexOf(p).all.get(id)?.title ?? "" : "");

export function nextId(p: Project, coll: CollKey): string {
  const pre = COLL_PREFIX[coll];
  const max = (p[coll] as AnyItem[]).reduce((m, it) => Math.max(m, parseInt(it.id.slice(pre.length)) || 0), 0);
  return pre + (max + 1);
}

/** Remove an item and every reference to it, wherever it was linked. */
export function deleteItem(p: Project, id: string) {
  const coll = PREFIX[typeOf(id)]?.coll as CollKey | undefined;
  if (!coll) return;
  (p[coll] as AnyItem[]) = (p[coll] as AnyItem[]).filter((x) => x.id !== id);
  for (const c of COLLS) for (const it of p[c] as AnyItem[]) {
    it.links = it.links.filter((l) => l !== id);
    const r = it as unknown as Record<string, unknown>;
    for (const k of ["owner", "by", "from", "stakeholder"]) if (r[k] === id) delete r[k];
  }
  p.charter.links = p.charter.links.filter((l) => l !== id);
  p.budget.forEach((b) => (b.links = b.links.filter((l) => l !== id)));
  (["s", "w", "o", "t"] as const).forEach((k) => p.swot[k].forEach((x) => (x.links = x.links.filter((l) => l !== id))));
  p.analyses.forEach((a) => (a.ids = a.ids.filter((x) => x !== id)));
  p.raciPeople = p.raciPeople.filter((x) => x !== id);
  p.raci.forEach((r) => delete r.a[id]);
}

export const score = (r: { sc: Record<string, number> }, x: string, y: string) => (r.sc[x] ?? 0) * (r.sc[y] ?? 0);
export const pScore = (r: Risk) => score(r, "p", "i");
export const sev = (s: number) => (s >= 15 ? "high" : s >= 8 ? "med" : "low");
export const openIssueOf = (p: Project, rid: string) => p.issues.find((i) => i.from === rid && i.status !== "Closed");

/** ⚑ on a risk: open an issue linked to it, or close the open one. */
export function toggleIssue(p: Project, rid: string, lang: Lang) {
  const r = p.risks.find((x) => x.id === rid);
  if (!r) return;
  const open = openIssueOf(p, rid);
  if (open) { open.prevStatus = open.status; open.status = "Closed"; return; }
  const closed = p.issues.find((i) => i.from === rid);
  if (closed) { closed.status = closed.prevStatus && closed.prevStatus !== "Closed" ? closed.prevStatus : "Open"; return; }
  p.issues.push({
    id: nextId(p, "issues"), title: r.title + (lang === "da" ? " (er indtruffet)" : " (has occurred)"),
    prio: sev(pScore(r)) === "high" ? "High" : "Medium", status: "Open", owner: r.owner, from: rid, auto: true, links: [...r.links],
  });
}
export const risksFor = (p: Project, sid: string) => p.risks.filter((r) => r.links.includes(sid));
export const peopleFor = (p: Project, sid: string) => p.people.filter((x) => x.stakeholder === sid);
export const piQuad = (s: { sc: Record<string, number> }) => {
  const P = (s.sc.power ?? 0) >= 3, I = (s.sc.interest ?? 0) >= 3;
  return P ? (I ? "hh" : "hl") : I ? "lh" : "ll";
};
