import type { Dim, L10n } from "../model/types";

export const L = (en: string, da: string): L10n => ({ en, da });

/** The swappable axes. Built-ins ship here; a project can add its own. */
export const DEFAULT_S_DIMS: Dim[] = [
  { id: "power", name: L("Power (overall)", "Magt (samlet)") },
  { id: "interest", name: L("Interest", "Interesse") },
  { id: "invest", name: L("Monetary investment", "Økonomisk investering") },
  { id: "influence", name: L("Direct influence", "Direkte indflydelse") },
  { id: "authority", name: L("Formal decision authority", "Formel beslutningsret") },
  { id: "affected", name: L("How affected they are", "Hvor berørt de er") },
  { id: "urgency", name: L("Urgency of claims", "Hast i deres krav") },
  { id: "legit", name: L("Legitimacy", "Legitimitet") },
  { id: "support", name: L("Support for project", "Opbakning til projektet") },
  { id: "revenue", name: L("Share of revenue", "Andel af omsætning") },
  { id: "churn", name: L("Risk of churn", "Risiko for at miste dem") },
  { id: "expertise", name: L("Expertise", "Ekspertise") },
];
export const DEFAULT_R_DIMS: Dim[] = [
  { id: "p", name: L("Probability", "Sandsynlighed") },
  { id: "i", name: L("Impact (highest of price, time, resources)", "Konsekvens (højeste af pris, tid, ressourcer)") },
  { id: "fin", name: L("Consequence: price", "Konsekvens: pris") },
  { id: "sched", name: L("Consequence: time", "Konsekvens: tid") },
  { id: "res", name: L("Consequence: resources", "Konsekvens: ressourcer") },
  { id: "rep", name: L("Reputation impact", "Konsekvens for omdømme") },
  { id: "qual", name: L("Quality impact", "Konsekvens for kvalitet") },
  { id: "prox", name: L("Proximity (how soon)", "Nærhed (hvor snart)") },
  { id: "detect", name: L("Hard to detect", "Svær at opdage") },
  { id: "ctrl", name: L("Outside our control", "Uden for vores kontrol") },
];

export const S_TYPES = ["Internal", "External"] as const;
export const ISSUE_STATUSES = ["Open", "In progress", "Escalated", "Closed"];
export const RISK_STATUSES = ["Open", "Mitigating", "Watching", "Closed"];
export const PRIORITIES = ["High", "Medium", "Low"];
export const CHANGE_STATUSES = ["Under review", "Approved", "Rejected"];
export const ASSUMPTION_KINDS = ["Assumption", "Dependency"];
export const ASSUMPTION_STATUSES = ["Unverified", "Confirmed", "At risk", "In talks", "Broken"];
export const TASK_COLS = ["todo", "doing", "done"];
/** While a project is being developed, criteria and deliverables are
 *  shaped and agreed, not yet tracked. Progress states come with the
 *  later project-management phase. */
export const DECISION_STATUSES = ["Open", "Decided"];
export const CRITERION_STATUSES = ["Draft", "Agreed"];
export const DELIVERABLE_STATUSES = ["Draft", "Agreed"];
/** Statuses from earlier versions, read as the nearest shaping state. */
export const LEGACY_STATUS: Record<string, string> = { "Not measured": "Draft", "Not started": "Draft", "In progress": "Draft", "At risk": "Draft", "Not met": "Draft", "On track": "Agreed", Met: "Agreed", Delivered: "Agreed", Accepted: "Agreed" };
/** The project triangle: the three factors a risk's consequence lands on. */
export const TRIANGLE = [{ key: "fin", en: "Price", da: "Pris" }, { key: "sched", en: "Time", da: "Tid" }, { key: "res", en: "Resources", da: "Ressourcer" }] as const;
/** Overall impact = the worst consequence on the triangle (at least 1). */
export const impactOf = (sc: Record<string, number>) => Math.max(1, sc.fin ?? 0, sc.sched ?? 0, sc.res ?? 0);
/** Stands for the project's purpose in `serves`, which is not an item. */
export const ROOT = "PURPOSE";
export const ENG_LEVELS = [L("Unaware", "Uvidende"), L("Resistant", "Modstander"), L("Neutral", "Neutral"), L("Supportive", "Støtter"), L("Leading", "Driver")];

export type ToolGroup = "core" | "project" | "registers" | "planning" | "people" | "review";
export interface ToolDef {
  id: string;
  group: ToolGroup;
  optional?: boolean;
  /** "run": for running the project once it has started. The app is for
   *  developing a project; these stay available but are set apart. */
  phase?: "run";
}
/** The core (overview, actors, risks) is always on. Everything else is an
 *  add-on a project switches on when it needs it. */
export const TOOLS: ToolDef[] = [
  { id: "overview", group: "core" },
  { id: "purpose", group: "core" },
  { id: "actors", group: "core" },
  { id: "risks", group: "core" },
  { id: "stakeholders", group: "registers", optional: true },
  { id: "riskanalysis", group: "registers", optional: true },
  { id: "issues", group: "registers", optional: true, phase: "run" },
  { id: "decisions", group: "registers", optional: true },
  { id: "changes", group: "registers", optional: true, phase: "run" },
  { id: "templates", group: "project", optional: true },
  { id: "charter", group: "project", optional: true },
  { id: "wbs", group: "planning", optional: true },
  { id: "schedule", group: "planning", optional: true },
  { id: "board", group: "planning", optional: true, phase: "run" },
  { id: "budget", group: "planning", optional: true },
  { id: "people", group: "people", optional: true },
  { id: "raci", group: "people", optional: true },
  { id: "engagement", group: "people", optional: true },
  { id: "comms", group: "people", optional: true },
  { id: "swot", group: "review", optional: true },
  { id: "benefits", group: "review", optional: true },
  { id: "lessons", group: "review", optional: true },
];
export const ALWAYS_ON = ["overview", "purpose", "actors", "risks"];
export const DEFAULT_TOOLS = [...ALWAYS_ON];

/** Prefix → which collection holds that item, and which tool shows it. */
export const PREFIX: Record<string, { coll: string; view: string }> = {
  S: { coll: "stakeholders", view: "actors" },
  P: { coll: "people", view: "actors" },
  R: { coll: "risks", view: "risks" },
  I: { coll: "issues", view: "issues" },
  D: { coll: "decisions", view: "decisions" },
  A: { coll: "assumptions", view: "riskanalysis" },
  C: { coll: "changes", view: "changes" },
  M: { coll: "milestones", view: "schedule" },
  T: { coll: "tasks", view: "board" },
  B: { coll: "benefits", view: "benefits" },
  L: { coll: "lessons", view: "lessons" },
  W: { coll: "wbs", view: "wbs" },
  G: { coll: "goals", view: "purpose" },
  SC: { coll: "criteria", view: "purpose" },
  DL: { coll: "deliverables", view: "purpose" },
};
export const COLL_PREFIX: Record<string, string> = Object.fromEntries(Object.entries(PREFIX).map(([p, v]) => [v.coll, p]));
