import type { AnyItem, CollKey, Lang, Project, Risk } from "../model/types";
import { COLL_PREFIX } from "../data/catalog";

export const COLLS: CollKey[] = ["stakeholders", "people", "risks", "issues", "decisions", "assumptions", "changes", "milestones", "tasks", "benefits", "lessons", "wbs"];
/** Fallback for IDs not in the project (yet): the letters before the number. */
export const typeOf = (id: string) => id.replace(/\d+$/, "");
/** Which register an ID belongs to, as its prefix letter (S, P, R…). IDs can
 *  be anything the user types, so this asks the index, not the ID's text. */
export const kindOf = (p: Project, id: string) => {
  const c = indexOf(p).all.get(id)?.coll;
  return c ? COLL_PREFIX[c] : typeOf(id);
};

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
  [...(indexOf(p).refs.get(id) ?? [])].filter((x) => !type || kindOf(p, x) === type).sort(byNum);
export const titleOf = (p: Project, id?: string) => (id ? indexOf(p).all.get(id)?.title ?? "" : "");

export function nextId(p: Project, coll: CollKey): string {
  const pre = COLL_PREFIX[coll];
  const max = (p[coll] as AnyItem[]).reduce((m, it) => Math.max(m, it.id.startsWith(pre) ? parseInt(it.id.slice(pre.length)) || 0 : 0), 0);
  const all = indexOf(p).all;
  let n = max + 1;
  while (all.has(pre + n)) n++;
  return pre + n;
}
export const isAutoId = (id: string, coll: CollKey) => new RegExp(`^${COLL_PREFIX[coll]}\\d+$`).test(id);
export const cleanId = (s: string) => s.trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}._-]/gu, "").slice(0, 24);

/** The ID to use for a new item: what the user typed, or the next free one
 *  when the field was left empty. Returns null if the typed ID is taken. */
export function chooseId(p: Project, coll: CollKey, typed: string): string | null {
  const id = cleanId(typed);
  if (!id) return nextId(p, coll);
  return indexOf(p).all.has(id) ? null : id;
}

/** Give an item a new ID and update every reference to it. */
export function renameId(p: Project, from: string, to: string) {
  if (!to || from === to) return;
  const swapAll = (xs: string[]) => xs.map((x) => (x === from ? to : x));
  for (const c of COLLS) for (const it of p[c] as AnyItem[]) {
    if (it.id === from) it.id = to;
    it.links = swapAll(it.links);
    const r = it as unknown as Record<string, unknown>;
    for (const k of ["owner", "by", "from", "stakeholder"]) if (r[k] === from) r[k] = to;
  }
  p.charter.links = swapAll(p.charter.links);
  p.budget.forEach((b) => (b.links = swapAll(b.links)));
  (["s", "w", "o", "t"] as const).forEach((k) => p.swot[k].forEach((x) => (x.links = swapAll(x.links))));
  p.analyses.forEach((a) => (a.ids = swapAll(a.ids)));
  p.raciPeople = swapAll(p.raciPeople);
  p.raci.forEach((r) => { if (from in r.a) { r.a[to] = r.a[from]; delete r.a[from]; } });
}

/** Remove an item and every reference to it, wherever it was linked. */
export function deleteItem(p: Project, id: string) {
  const coll = indexOf(p).all.get(id)?.coll;
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
