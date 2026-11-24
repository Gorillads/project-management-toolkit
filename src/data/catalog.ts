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
  { id: "i", name: L("Impact (overall)", "Konsekvens (samlet)") },
  { id: "fin", name: L("Financial impact", "Økonomisk konsekvens") },
  { id: "sched", name: L("Schedule impact", "Konsekvens for tidsplan") },
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
export const ENG_LEVELS = [L("Unaware", "Uvidende"), L("Resistant", "Modstander"), L("Neutral", "Neutral"), L("Supportive", "Støtter"), L("Leading", "Driver")];

export type ToolGroup = "project" | "registers" | "planning" | "people" | "review";
export interface ToolDef {
  id: string;
  group: ToolGroup;
  optional?: boolean;
}
export const TOOLS: ToolDef[] = [
  { id: "overview", group: "project" },
  { id: "templates", group: "project" },
  { id: "charter", group: "project" },
  { id: "stakeholders", group: "registers" },
  { id: "risks", group: "registers" },
  { id: "issues", group: "registers" },
  { id: "decisions", group: "registers" },
  { id: "changes", group: "registers", optional: true },
  { id: "wbs", group: "planning" },
  { id: "schedule", group: "planning" },
  { id: "board", group: "planning" },
  { id: "budget", group: "planning" },
  { id: "people", group: "people" },
  { id: "raci", group: "people" },
  { id: "engagement", group: "people" },
  { id: "comms", group: "people" },
  { id: "swot", group: "review" },
  { id: "benefits", group: "review" },
  { id: "lessons", group: "review" },
];
export const ALWAYS_ON = ["overview", "templates"];
export const DEFAULT_TOOLS = TOOLS.filter((t) => !t.optional).map((t) => t.id);

/** Prefix → which collection holds that item, and which tool shows it. */
export const PREFIX: Record<string, { coll: string; view: string }> = {
  S: { coll: "stakeholders", view: "stakeholders" },
  P: { coll: "people", view: "people" },
  R: { coll: "risks", view: "risks" },
  I: { coll: "issues", view: "issues" },
  D: { coll: "decisions", view: "decisions" },
  A: { coll: "assumptions", view: "risks" },
  C: { coll: "changes", view: "changes" },
  M: { coll: "milestones", view: "schedule" },
  T: { coll: "tasks", view: "board" },
  B: { coll: "benefits", view: "benefits" },
  L: { coll: "lessons", view: "lessons" },
  W: { coll: "wbs", view: "wbs" },
};
export const COLL_PREFIX: Record<string, string> = Object.fromEntries(Object.entries(PREFIX).map(([p, v]) => [v.coll, p]));
