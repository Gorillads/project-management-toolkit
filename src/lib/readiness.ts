import type { Project } from "../model/types";
import { ROOT } from "../data/catalog";
import { kindOf } from "./links";

/** One step in shaping a project. `have`/`of` say how far it is when the
 *  step is about every item of a kind (e.g. 3 of 5 risks have an owner). */
export interface Step {
  key: string;
  done: boolean;
  have?: number;
  of?: number;
  view: string;
  /** What to select on that page, so a click lands on the first gap. */
  sel?: string;
}

/** The steps of developing a project, in the order they are usually done:
 *  why it exists, how success is known, what it delivers, who is involved,
 *  and what could go wrong. */
export function readiness(p: Project): Step[] {
  const goalScope = (id: string): string[] => [id, ...p.goals.filter((g) => g.parent === id).flatMap((g) => goalScope(g.id))];
  const critScope = (id: string): string[] => [id, ...p.criteria.filter((c) => c.parent === id).flatMap((c) => critScope(c.id))];
  const measured = p.goals.filter((g) => p.criteria.some((c) => c.serves.some((s) => goalScope(g.id).includes(s))));
  const withTarget = p.criteria.filter((c) => c.target.trim());
  const delivered = p.criteria.filter((c) => p.deliverables.some((d) => d.serves.some((s) => critScope(c.id).includes(s))));
  const hasReason = (d: { serves: string[]; parent?: string }, depth = 0): boolean =>
    d.serves.length > 0 || (!!d.parent && depth < 20 && (() => { const par = p.deliverables.find((x) => x.id === d.parent); return !!par && hasReason(par, depth + 1); })());
  const reasoned = p.deliverables.filter((d) => hasReason(d));
  const owned = p.risks.filter((r) => r.owner && r.mit.trim());
  const caused = p.risks.filter((r) => (r.cause ?? "").trim() && Math.max(r.sc.fin ?? 0, r.sc.sched ?? 0, r.sc.res ?? 0) > 0);
  const linked = p.risks.filter((r) => r.links.some((id) => ["S", "P", "DL"].includes(kindOf(p, id))));
  const agreed = [...p.criteria, ...p.deliverables].filter((x) => x.status === "Agreed");
  const first = <T extends { id: string }>(all: T[], ok: T[]) => all.find((x) => !ok.includes(x))?.id;
  const every = <T extends { id: string }>(key: string, all: T[], ok: T[], view: string) =>
    ({ key, done: all.length > 0 && ok.length === all.length, have: ok.length, of: all.length, view, sel: first(all, ok) });
  return [
    { key: "purpose", done: !!p.charter.purpose.trim(), view: "purpose", sel: ROOT },
    { key: "goals", done: p.goals.length > 0 || p.criteria.some((c) => c.serves.includes(ROOT)), view: "purpose", sel: ROOT },
    every("measured", p.goals, measured, "purpose"),
    every("targets", p.criteria, withTarget, "purpose"),
    every("delivered", p.criteria, delivered, "purpose"),
    every("reasoned", p.deliverables, reasoned, "purpose"),
    { key: "team", done: p.people.length > 0, have: p.people.length, view: "actors" },
    { key: "stakeholders", done: p.stakeholders.length > 0, have: p.stakeholders.length, view: "actors" },
    { key: "risks", done: p.risks.length > 0, have: p.risks.length, view: "risks" },
    every("riskCause", p.risks, caused, "risks"),
    every("riskOwned", p.risks, owned, "risks"),
    every("riskLinked", p.risks, linked, "risks"),
    { key: "agreed", done: agreed.length > 0 && agreed.length === p.criteria.length + p.deliverables.length, have: agreed.length, of: p.criteria.length + p.deliverables.length, view: "purpose",
      sel: [...p.criteria, ...p.deliverables].find((x) => x.status !== "Agreed")?.id },
  ];
}
