import type { Lang, Project } from "../model/types";
import { P_GROUPS, S_CATS, defaultAnalyses, projectFromTemplate } from "../data/projects";
import { tplById } from "../data/templates";
import { DEFAULT_TOOLS } from "../data/catalog";
import { cleanId } from "./links";
import { syncCats } from "./categories";

/** Everything the new-project setup asks: the project, its actors and its
 *  risks. Rows carry a local `key` so a risk can name its owner and the
 *  stakeholders it affects before any project IDs exist. `id` is what the
 *  user typed, if anything. */
export interface WzPerson { key: string; id: string; name: string; role: string; group: string }
export interface WzStake { key: string; id: string; name: string; cat: string; type: "Internal" | "External"; power: number; interest: number; on: boolean }
/** A risk in the setup: the event, its cause, and its consequence on price, time and resources (0-5). */
export interface WzRisk { key: string; id: string; title: string; cat: string; cause: string; p: number; fin: number; sched: number; res: number; owner: string; affects: string[]; mit: string; on: boolean }
export interface Answers {
  templateId: string;
  name: string;
  org: string;
  purpose: string;
  people: WzPerson[];
  stakes: WzStake[];
  risks: WzRisk[];
  /** The group lists the project will start with, editable in the setup. */
  pGroups: string[];
  sCats: string[];
}

/** Edit a group list in the answers, keeping the rows that use it in step. */
export type GroupList = "pGroups" | "sCats";
const ROWS = { pGroups: ["people", "group"], sCats: ["stakes", "cat"] } as const;
export function groupCount(a: Answers, k: GroupList, name: string) {
  const [rows, f] = ROWS[k];
  return (a[rows] as unknown as Record<string, unknown>[]).filter((r) => r[f] === name && (rows === "people" || (r as { on?: boolean }).on !== false)).length;
}
export function groupAdd(a: Answers, k: GroupList, name: string): Answers | null {
  const n = name.trim();
  if (!n || a[k].some((c) => c.toLowerCase() === n.toLowerCase())) return null;
  return { ...a, [k]: [...a[k], n] };
}
export function groupRename(a: Answers, k: GroupList, from: string, to: string): Answers | null {
  const n = to.trim();
  if (!n || a[k].some((c) => c !== from && c.toLowerCase() === n.toLowerCase())) return null;
  const [rows, f] = ROWS[k];
  return { ...a, [k]: a[k].map((c) => (c === from ? n : c)), [rows]: (a[rows] as unknown as Record<string, unknown>[]).map((r) => (r[f] === from ? { ...r, [f]: n } : r)) };
}
export function groupRemove(a: Answers, k: GroupList, name: string): Answers {
  const [rows, f] = ROWS[k];
  return { ...a, [k]: a[k].filter((c) => c !== name), [rows]: (a[rows] as unknown as Record<string, unknown>[]).map((r) => (r[f] === name ? { ...r, [f]: "" } : r)) };
}
export function groupMove(a: Answers, k: GroupList, name: string, dir: -1 | 1): Answers {
  const list = [...a[k]], i = list.indexOf(name), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return a;
  [list[i], list[j]] = [list[j], list[i]];
  return { ...a, [k]: list };
}

let n = 0;
export const key = () => "k" + Date.now().toString(36) + (++n).toString(36);

/** Typed IDs are kept when they are unique; empty or clashing ones get the
 *  next free automatic ID (P1, S1, R1…). Same rule as everywhere in the app. */
export function assignIds<T extends { key: string; id: string }>(rows: T[], prefix: string, taken: Set<string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of rows) { const id = cleanId(r.id); if (id && !taken.has(id)) { taken.add(id); out.set(r.key, id); } }
  let next = 1;
  for (const r of rows) {
    if (out.has(r.key)) continue;
    while (taken.has(prefix + next)) next++;
    taken.add(prefix + next);
    out.set(r.key, prefix + next);
  }
  return out;
}
export const activeRows = (a: Answers) => ({
  people: a.people.filter((x) => x.name.trim() || x.role.trim()),
  stakes: a.stakes.filter((x) => x.on && x.name.trim()),
  risks: a.risks.filter((x) => x.on && x.title.trim()),
});
/** The IDs every row will get, for showing as placeholders while typing. */
export function previewIds(a: Answers) {
  const r = activeRows(a);
  const taken = new Set<string>();
  return new Map([...assignIds(r.people, "P", taken), ...assignIds(r.stakes, "S", taken), ...assignIds(r.risks, "R", taken)]);
}

export function templateDefaults(templateId: string, lang: Lang): Pick<Answers, "stakes" | "risks"> {
  const tpl = tplById(templateId);
  return {
    stakes: tpl.groups.map(([name, , type], i) => ({ key: key(), id: "", name: name[lang], cat: "", type, power: i < 2 ? 4 : 3, interest: type === "Internal" ? 4 : 3, on: true })),
    risks: tpl.risks.map(([title, cat, cause, [fin, sched, res]]) => ({ key: key(), id: "", title: title[lang], cat, cause: cause[lang], p: 3, fin, sched, res, owner: "", affects: [], mit: "", on: true })),
  };
}

export function initialAnswers(templateId: string, lang: Lang): Answers {
  const da = lang === "da";
  return {
    templateId, name: "", org: "", purpose: "",
    people: [
      { key: key(), id: "", name: "", role: da ? "Projektleder" : "Project manager", group: "" },
      { key: key(), id: "", name: "", role: da ? "Projektejer / sponsor" : "Project sponsor", group: "" },
    ],
    ...templateDefaults(templateId, lang),
    pGroups: [...P_GROUPS],
    sCats: [...S_CATS],
  };
}

/** Turn the answers into a project with the core filled in and linked. */
export function buildProject(a: Answers, lang: Lang): Project {
  const p = projectFromTemplate(a.templateId, lang, a.name.trim() || (lang === "da" ? "Nyt projekt" : "New project"));
  p.org = a.org.trim();
  const rows = activeRows(a);
  const ids = previewIds(a);
  // The purpose answer becomes the purpose in the Purpose & success tab.
  if (a.purpose.trim()) { const taken = new Set([...ids.values()]); let n = 1; while (taken.has("G" + n)) n++; p.goals = [{ id: "G" + n, title: a.purpose.trim(), links: [] }]; }
  p.people = rows.people.map((x) => ({ id: ids.get(x.key)!, title: x.name.trim() || x.role.trim(), role: x.role.trim(), group: x.group, org: p.org, resp: "", links: [] }));
  p.stakeholders = rows.stakes.map((x) => {
    const sc = Object.fromEntries(p.sDims.map((d) => [d.id, 3]));
    sc.power = x.power; sc.interest = x.interest; sc.influence = x.power; sc.affected = x.interest;
    return { id: ids.get(x.key)!, title: x.name.trim(), cat: x.cat, type: x.type, org: "", need: "", links: [], sc, engCurrent: 2, engDesired: x.power >= 3 ? 3 : 2 };
  });
  p.risks = rows.risks.map((x) => {
    const sc = Object.fromEntries(p.rDims.map((d) => [d.id, 3]));
    sc.p = x.p; sc.fin = x.fin; sc.sched = x.sched; sc.res = x.res; sc.i = Math.max(1, x.fin, x.sched, x.res);
    return { id: ids.get(x.key)!, title: x.title.trim(), cat: x.cat, cause: (x.cause ?? "").trim(), consequence: "", status: "Open", mit: x.mit.trim(), owners: x.owner && ids.get(x.owner) ? [ids.get(x.owner)!] : [], links: x.affects.map((k) => ids.get(k)).filter(Boolean) as string[], sc };
  });
  p.pGroups = [...a.pGroups];
  p.sCats = [...a.sCats];
  p.enabled = [...DEFAULT_TOOLS];
  syncCats(p);
  p.analyses = defaultAnalyses(p.stakeholders, lang);
  return p;
}
