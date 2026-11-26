import type { Lang, Project } from "../model/types";
import { defaultAnalyses, projectFromTemplate } from "../data/projects";
import { tplById } from "../data/templates";

/** Everything the new-project wizard asks. Rows carry a local `key` so the
 *  answers can reference each other (a risk's owner, the stakeholders it
 *  affects) before any project IDs exist. */
export interface WzPerson { key: string; name: string; role: string; resp: string; group: string }
export interface WzStake { key: string; name: string; cat: string; type: "Internal" | "External"; power: number; interest: number; on: boolean }
export interface WzRisk { key: string; title: string; cat: string; p: number; i: number; owner: string; affects: string[]; mit: string; on: boolean }
export interface WzMilestone { key: string; title: string; phase: string; date: string }
export interface WzBenefit { key: string; title: string; kpi: string }
export interface Answers {
  templateId: string;
  name: string;
  org: string;
  purpose: string;
  start: string;
  goLive: string;
  budget: number;
  currency: string;
  inScope: string;
  outScope: string;
  people: WzPerson[];
  stakes: WzStake[];
  risks: WzRisk[];
  milestones: WzMilestone[];
  benefits: WzBenefit[];
  tools: string[];
}

let n = 0;
export const key = () => "k" + Date.now().toString(36) + (++n).toString(36);
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addMonths = (s: string, m: number) => { const d = new Date(s); d.setMonth(d.getMonth() + m); return iso(d); };

/** Spread the template's decision gates evenly between start and go-live. */
export function gateDates(templateId: string, start: string, goLive: string, lang: Lang): WzMilestone[] {
  const tpl = tplById(templateId);
  const a = +new Date(start), b = +new Date(goLive);
  const span = Math.max(b - a, 7 * 864e5);
  return tpl.phases.map(([phase, gate], i) => ({ key: key(), title: gate[lang], phase: phase[lang], date: iso(new Date(a + (span * (i + 1)) / tpl.phases.length)) }));
}

/** The parts of the answers that come from the project type. */
export function templateDefaults(templateId: string, lang: Lang, start: string, goLive: string): Pick<Answers, "stakes" | "risks" | "milestones" | "tools"> {
  const tpl = tplById(templateId);
  return {
    stakes: tpl.groups.map(([name, cat, type], i) => ({ key: key(), name: name[lang], cat, type, power: i < 2 ? 4 : 3, interest: type === "Internal" ? 4 : 3, on: true })),
    risks: tpl.risks.map(([title, cat]) => ({ key: key(), title: title[lang], cat, p: 3, i: 3, owner: "", affects: [], mit: "", on: true })),
    milestones: gateDates(templateId, start, goLive, lang),
    tools: [...tpl.tools],
  };
}

export function initialAnswers(templateId: string, lang: Lang): Answers {
  const start = iso(new Date());
  const goLive = addMonths(start, 6);
  const da = lang === "da";
  return {
    templateId, name: "", org: "", purpose: "", start, goLive, budget: 0, currency: "DKK", inScope: "", outScope: "",
    people: [
      { key: key(), name: "", role: da ? "Projektleder" : "Project manager", resp: da ? "Plan, budget og rapportering" : "Plan, budget and reporting", group: "Project team" },
      { key: key(), name: "", role: da ? "Projektejer / sponsor" : "Project sponsor", resp: da ? "Ejer business casen og godkender budgettet" : "Owns the business case and approves the budget", group: "Steering committee" },
    ],
    benefits: [{ key: key(), title: "", kpi: "" }],
    ...templateDefaults(templateId, lang, start, goLive),
  };
}

/** Turn the answers into a complete, linked project. */
export function buildProject(a: Answers, lang: Lang): Project {
  const da = lang === "da";
  const p = projectFromTemplate(a.templateId, lang, a.name.trim() || (da ? "Nyt projekt" : "New project"));
  const tpl = tplById(a.templateId);
  p.org = a.org.trim();

  const people = a.people.filter((x) => x.name.trim() || x.role.trim());
  const pid = new Map(people.map((x, i) => [x.key, `P${i + 1}`]));
  p.people = people.map((x, i) => ({ id: `P${i + 1}`, title: x.name.trim() || x.role.trim(), role: x.role.trim(), group: x.group, org: p.org, resp: x.resp.trim(), links: [] }));

  const stakes = a.stakes.filter((x) => x.on && x.name.trim());
  const sid = new Map(stakes.map((x, i) => [x.key, `S${i + 1}`]));
  p.stakeholders = stakes.map((x, i) => {
    const sc = Object.fromEntries(p.sDims.map((d) => [d.id, 3]));
    sc.power = x.power; sc.interest = x.interest; sc.influence = x.power; sc.affected = x.interest;
    return { id: `S${i + 1}`, title: x.name.trim(), cat: x.cat, type: x.type, org: "", need: "", links: [], sc, engCurrent: 2, engDesired: x.power >= 3 ? 3 : 2 };
  });

  const risks = a.risks.filter((x) => x.on && x.title.trim());
  p.risks = risks.map((x, i) => {
    const sc = Object.fromEntries(p.rDims.map((d) => [d.id, 3]));
    sc.p = x.p; sc.i = x.i;
    return { id: `R${i + 1}`, title: x.title.trim(), cat: x.cat, status: "Open", mit: x.mit.trim(), owner: pid.get(x.owner), links: x.affects.map((k) => sid.get(k)).filter(Boolean) as string[], sc };
  });

  const ms = [...a.milestones].filter((m) => m.title.trim() && m.date).sort((x, y) => x.date.localeCompare(y.date));
  p.milestones = ms.map((m, i) => ({ id: `M${i + 1}`, title: m.title.trim(), date: m.date, done: false, links: [] }));
  const pm = p.people.find((x) => x.group === "Project team")?.id;
  let prev = a.start;
  p.wbs = ms.map((m, i) => {
    const w = { id: `W${i + 1}`, code: String(i + 1), title: m.phase || m.title, owner: pm, start: prev, end: m.date, progress: 0, links: [`M${i + 1}`] };
    prev = m.date;
    return w;
  });

  const benefits = a.benefits.filter((b) => b.title.trim());
  const sponsor = p.people.find((x) => x.group === "Steering committee")?.id;
  p.benefits = benefits.map((b, i) => ({ id: `B${i + 1}`, title: b.title.trim(), kpi: b.kpi.trim(), owner: sponsor, links: [] }));

  const k = Math.round((a.budget || 0) / 1000);
  p.currency = a.currency || "DKK";
  if (k > 0) p.budget = [{ id: "BU1", area: da ? "Samlet budget" : "Total budget", plan: k, act: 0, fc: k, links: [] }];
  p.charter = {
    purpose: a.purpose.trim(), inScope: a.inScope.trim(), outScope: a.outScope.trim(),
    budgetNote: k > 0 ? `${(a.budget || 0).toLocaleString(da ? "da-DK" : "en-GB")} ${p.currency}` : "",
    goLive: a.goLive,
    links: [sponsor, ...p.benefits.map((b) => b.id), p.milestones.at(-1)?.id].filter(Boolean) as string[],
  };
  if (pm || sponsor) p.raciPeople = [pm, sponsor].filter(Boolean) as string[];
  p.raci = tpl.decisions.slice(0, 3).map((d, i) => ({ id: `X${i + 1}`, task: d[lang], a: { ...(sponsor ? { [sponsor]: "A" as const } : {}), ...(pm ? { [pm]: "R" as const } : {}) } }));
  p.enabled = ["overview", "templates", ...a.tools];
  p.analyses = defaultAnalyses(p.stakeholders, lang);
  p.phase = 0;
  return p;
}
