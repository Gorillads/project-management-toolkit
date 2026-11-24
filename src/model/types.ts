export type Lang = "da" | "en";

/** A text that exists in both UI languages (built-in labels, template content). */
export type L10n = { en: string; da: string };

/** Every register item shares this shape, so tables, editors, links and
 *  backlinks can all be written once. `title` is the item's display name. */
export interface BaseItem {
  id: string;
  title: string;
  links: string[];
  notes?: string;
}

export interface Stakeholder extends BaseItem {
  cat: string;
  type: "Internal" | "External";
  org: string;
  need: string;
  sc: Record<string, number>;
  engCurrent?: number;
  engDesired?: number;
  commsChannel?: string;
  commsFreq?: string;
}
export interface Person extends BaseItem {
  role: string;
  group: string;
  org: string;
  resp: string;
  email?: string;
  stakeholder?: string;
}
export interface Risk extends BaseItem {
  cat: string;
  owner?: string;
  mit: string;
  status: string;
  sc: Record<string, number>;
}
export interface Issue extends BaseItem {
  prio: string;
  status: string;
  owner?: string;
  from?: string;
  auto?: boolean;
  prevStatus?: string;
}
export interface Decision extends BaseItem {
  date: string;
  by?: string;
  tpl?: string;
}
export interface Assumption extends BaseItem {
  kind: string;
  status: string;
}
export interface Change extends BaseItem {
  by?: string;
  cost: number;
  weeks: number;
  status: string;
}
export interface Milestone extends BaseItem {
  date: string;
  done: boolean;
}
export interface Task extends BaseItem {
  col: string;
  owner?: string;
}
export interface Benefit extends BaseItem {
  kpi: string;
  owner?: string;
}
export interface Lesson extends BaseItem {
  source: string;
}
export interface WorkPackage extends BaseItem {
  code: string;
  owner?: string;
  start?: string;
  end?: string;
  progress: number;
}

export interface Collections {
  stakeholders: Stakeholder[];
  people: Person[];
  risks: Risk[];
  issues: Issue[];
  decisions: Decision[];
  assumptions: Assumption[];
  changes: Change[];
  milestones: Milestone[];
  tasks: Task[];
  benefits: Benefit[];
  lessons: Lesson[];
  wbs: WorkPackage[];
}
export type CollKey = keyof Collections;
export type AnyItem = Collections[CollKey][number];

export interface Dim {
  id: string;
  name: L10n;
}
export interface Analysis {
  id: string;
  name: string;
  scope: string;
  ids: string[];
  x: string;
  y: string;
  grid: 2 | 5;
  pinned?: boolean;
  quads?: { hh: string; hl: string; lh: string; ll: string };
}
export interface Lens {
  id: string;
  name: string;
  x: string;
  y: string;
  cats: string[];
  sCat: string;
  pinned?: boolean;
}
export interface BudgetLine {
  id: string;
  area: string;
  plan: number;
  act: number;
  fc: number;
  fileId?: string;
  range?: string;
  links: string[];
}
export interface LinkedFile {
  id: string;
  name: string;
  ext: string;
  where: string;
  synced: string;
  note: string;
}
export interface RaciRow {
  id: string;
  task: string;
  a: Record<string, "R" | "A" | "C" | "I">;
}
export interface SwotItem {
  id: string;
  text: string;
  links: string[];
}
export interface Charter {
  purpose: string;
  inScope: string;
  outScope: string;
  budgetNote: string;
  goLive: string;
  links: string[];
}

export interface Project extends Collections {
  id: string;
  name: string;
  org: string;
  templateId: string;
  phase: number;
  currency: string;
  charter: Charter;
  budget: BudgetLine[];
  files: LinkedFile[];
  raci: RaciRow[];
  raciPeople: string[];
  swot: { s: SwotItem[]; w: SwotItem[]; o: SwotItem[]; t: SwotItem[] };
  sDims: Dim[];
  rDims: Dim[];
  sCats: string[];
  rCats: string[];
  pGroups: string[];
  analyses: Analysis[];
  lenses: Lens[];
  enabled: string[];
}
