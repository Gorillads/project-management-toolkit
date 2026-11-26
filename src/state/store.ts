import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { Lang, Project } from "../model/types";
import { exampleProject, projectFromTemplate } from "../data/projects";
import { syncOwners } from "../lib/links";
import { flattenGoals, syncPurpose } from "../lib/structure";
import { tplById } from "../data/templates";
import { DEFAULT_R_DIMS, LEGACY_STATUS, impactOf } from "../data/catalog";
import { syncCats } from "../lib/categories";

export const MAX_PROJECTS = 10;
const STORAGE_KEY = "project-toolkit-v1";

/** localStorage can throw (private mode, quota, blocked site data); fall
 *  back to memory so the app still works for the session. */
const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return memory.get(k) ?? null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { memory.set(k, v); } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { memory.delete(k); } },
};

export interface UiState {
  view: string;
  sel: Record<string, string | undefined>;
  flash?: string;
  sMode: "list" | "analysis" | "compare";
  sCur: string;
  rMode: "one" | "compare";
  rSub: "register" | "assumptions";
  rCur: string;
  /** How the user arranged each tab's panels (see components/Board). */
  layouts?: Record<string, Layout>;
}
export type Col = "L" | "R" | "F";
export interface Layout { items: { id: string; col: Col }[]; hidden: string[]; split?: Split }
export type Split = "1:1" | "2:1" | "3:2" | "1:2";

interface AppStore {
  lang: Lang;
  projects: Record<string, Project>;
  order: string[];
  activeId: string;
  ui: UiState;
  setLang: (l: Lang) => void;
  setUi: (patch: Partial<UiState>) => void;
  go: (view: string, sel?: string, extra?: Partial<UiState>) => void;
  setActive: (id: string) => void;
  addProject: (p: Project) => void;
  newFromTemplate: (templateId: string, name?: string) => void;
  duplicate: () => void;
  close: (id: string) => void;
  /** Apply a change to the active project. The recipe gets a deep copy to
   *  mutate, so components never mutate stored state by accident. */
  update: (recipe: (p: Project) => void) => void;
  replaceActive: (p: Project) => void;
  wizard: { open: boolean; templateId?: string };
  openWizard: (templateId?: string) => void;
  closeWizard: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/** Undo history per project, kept in memory only. Edits within one second
 *  of each other (typing in a field) collapse into one step. */
const past = new Map<string, Project[]>();
const future = new Map<string, Project[]>();
let lastPush = 0;
const HISTORY = 60;
function remember(id: string, prev: Project) {
  const now = Date.now();
  const stack = past.get(id) ?? [];
  if (now - lastPush > 1000 || !stack.length) {
    stack.push(prev);
    if (stack.length > HISTORY) stack.shift();
    past.set(id, stack);
  }
  lastPush = now;
  future.set(id, []);
}

/** Keep each risk's overall impact equal to its worst triangle consequence. */
export function syncImpact(p: Project) {
  for (const r of p.risks) { if (r.sc) r.sc.i = impactOf(r.sc); syncOwners(r); }
  syncPurpose(p);
}

/** Make stored data safe to render: every item gets the text fields and
 *  lists the views expect, whatever an older version or an import left. */
export function repairProject(p: Project): Project {
  const str = (o: Record<string, unknown>, ks: string[]) => ks.forEach((k) => { if (typeof o[k] !== "string") o[k] = o[k] == null ? "" : String(o[k]); });
  const need: Record<string, string[]> = {
    stakeholders: ["title", "cat", "type", "org", "need"], people: ["title", "role", "group", "org", "resp"], risks: ["title", "cat", "mit", "status"],
    issues: ["title", "prio", "status"], decisions: ["title", "date"], assumptions: ["title", "kind", "status"], changes: ["title", "status"],
    milestones: ["title", "date"], tasks: ["title", "col"], benefits: ["title", "kpi"], lessons: ["title", "source"], wbs: ["title", "code"],
    goals: ["title"], criteria: ["title", "target", "status"], deliverables: ["title", "status"],
  };
  for (const [c, ks] of Object.entries(need)) {
    const list = (p as unknown as Record<string, unknown>)[c];
    if (!Array.isArray(list)) { (p as unknown as Record<string, unknown>)[c] = []; continue; }
    for (const it of list as Record<string, unknown>[]) {
      if (typeof it.id !== "string") it.id = String(it.id ?? "");
      str(it, ks);
      if (!Array.isArray(it.links)) it.links = [];
      if ((c === "stakeholders" || c === "risks") && (typeof it.sc !== "object" || !it.sc)) it.sc = {};
      if ((c === "criteria" || c === "deliverables") && !Array.isArray(it.serves)) it.serves = [];
      if ((c === "criteria" || c === "deliverables") && !["Draft", "Agreed"].includes(it.status as string)) it.status = LEGACY_STATUS[it.status as string] ?? "Draft";
    }
  }
  p.charter ??= { purpose: "", inScope: "", outScope: "", budgetNote: "", goLive: "", links: [] };
  p.enabled ??= ["overview", "actors", "risks"];
  for (const k of ["budget", "files", "raci", "raciPeople", "analyses", "lenses", "sDims", "rDims", "sCats", "rCats", "pGroups"] as const) if (!Array.isArray(p[k])) (p as unknown as Record<string, unknown>)[k] = [];
  p.swot ??= { s: [], w: [], o: [], t: [] };
  p.templateId = tplById(p.templateId ?? "general").id;
  // Risk dimensions follow the triangle: built-ins get their current names,
  // and "resources" is added where it was missing (scored 0 = not assessed).
  for (const d of DEFAULT_R_DIMS) { const have = p.rDims.find((x) => x.id === d.id); if (have) have.name = d.name; else p.rDims.splice(p.rDims.findIndex((x) => x.id === "sched") + 1 || p.rDims.length, 0, { ...d }); }
  for (const r of p.risks) { r.sc ??= {}; r.sc.res ??= 0; r.sc.fin ??= 0; r.sc.sched ??= 0; if (typeof r.cause !== "string") r.cause = ""; if (typeof r.consequence !== "string") r.consequence = ""; syncOwners(r); }
  flattenGoals(p);
  syncImpact(p);
  for (const d of p.decisions) {
    if (d.status !== "Open" && d.status !== "Decided") d.status = "Decided";
    if (typeof d.date !== "string") d.date = "";
    if (!Array.isArray(d.options)) d.options = [];
    for (const o of d.options) { o.text ??= ""; o.pro ??= ""; o.con ??= ""; o.tri ??= { fin: 0, sched: 0, res: 0 }; }
    // An older free-text answer becomes the chosen option.
    if (d.choice?.trim() && !d.options.length) { d.options.push({ id: "o1", text: d.choice.trim(), pro: "", con: "", tri: { fin: 0, sched: 0, res: 0 } }); d.chosen = "o1"; }
    delete d.choice;
    if (d.chosen && !d.options.some((o) => o.id === d.chosen)) delete d.chosen;
  }
  syncCats(p);
  return p;
}

const firstUi: UiState = { view: "overview", sel: {}, sMode: "list", sCur: "pi", rMode: "one", rSub: "register", rCur: "pxi" };
const ex = exampleProject();

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      lang: "da",
      projects: { [ex.id]: ex },
      order: [ex.id],
      activeId: ex.id,
      ui: firstUi,
      setLang: (lang) => set({ lang }),
      setUi: (patch) => set({ ui: { ...get().ui, ...patch } }),
      go: (view, sel, extra) => {
        const ui = get().ui;
        set({ ui: { ...ui, ...extra, view, sel: sel ? { ...ui.sel, [view]: sel } : ui.sel, flash: sel } });
        try { history.replaceState(null, "", "#" + view); } catch { /* sandboxed frames */ }
      },
      setActive: (id) => set({ activeId: id, ui: { ...get().ui, sel: {}, flash: undefined }, canUndo: !!past.get(id)?.length, canRedo: !!future.get(id)?.length }),
      addProject: (p) => {
        const { order, projects } = get();
        if (order.length >= MAX_PROJECTS) return;
        const id = projects[p.id] ? p.id + "_" + Date.now().toString(36) : p.id;
        set({ projects: { ...projects, [id]: { ...p, id } }, order: [...order, id], activeId: id, ui: { ...get().ui, view: "overview", sel: {} } });
      },
      newFromTemplate: (templateId, name) => get().addProject(projectFromTemplate(templateId, get().lang, name)),
      duplicate: () => {
        const p = get().projects[get().activeId];
        if (!p) return;
        const copy = structuredClone(p);
        copy.id = "prj" + Date.now().toString(36);
        copy.name = p.name + (get().lang === "da" ? " (kopi)" : " (copy)");
        get().addProject(copy);
      },
      close: (id) => {
        const { order, projects, activeId } = get();
        if (order.length <= 1) return;
        const rest = order.filter((x) => x !== id);
        const next = { ...projects };
        delete next[id];
        set({ projects: next, order: rest, activeId: activeId === id ? rest[0] : activeId });
      },
      update: (recipe) => {
        const { activeId, projects } = get();
        const draft = structuredClone(projects[activeId]);
        recipe(draft);
        syncImpact(draft);
        remember(activeId, projects[activeId]);
        set({ projects: { ...projects, [activeId]: draft }, canUndo: true, canRedo: false });
      },
      replaceActive: (p) => {
        const { activeId, projects } = get();
        lastPush = 0;
        remember(activeId, projects[activeId]);
        set({ projects: { ...projects, [activeId]: { ...p, id: activeId } }, canUndo: true, canRedo: false });
      },
      undo: () => {
        const { activeId, projects } = get();
        const prev = past.get(activeId)?.pop();
        if (!prev) return;
        (future.get(activeId) ?? future.set(activeId, []).get(activeId)!).push(projects[activeId]);
        lastPush = 0;
        set({ projects: { ...projects, [activeId]: prev }, canUndo: !!past.get(activeId)?.length, canRedo: true });
      },
      redo: () => {
        const { activeId, projects } = get();
        const next = future.get(activeId)?.pop();
        if (!next) return;
        (past.get(activeId) ?? past.set(activeId, []).get(activeId)!).push(projects[activeId]);
        lastPush = 0;
        set({ projects: { ...projects, [activeId]: next }, canUndo: true, canRedo: !!future.get(activeId)?.length });
      },
      wizard: { open: false },
      openWizard: (templateId) => set({ wizard: { open: true, templateId } }),
      closeWizard: () => set({ wizard: { open: false } }),
      canUndo: false,
      canRedo: false,
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      // v2: the app starts simple. Existing projects keep all their data but
      // show only the core tools until add-ons are switched on again.
      migrate: (state, version) => {
        const s = state as { projects?: Record<string, Project> };
        if (version < 2 && s.projects) for (const p of Object.values(s.projects)) p.enabled = ["overview", "actors", "risks"];
        // v3: the purpose is an item in the Purpose tab, not the Overview's
        // description. Copy the old text into a purpose goal once, put the
        // old top-level goals under it, and point "PURPOSE" links at it.
        if (version < 3 && s.projects) for (const p of Object.values(s.projects)) {
          const goals = (p.goals ??= []), crits = p.criteria ?? [];
          const text = (p.charter?.purpose ?? "").trim();
          const usesRoot = crits.some((c) => (c.serves ?? []).includes("PURPOSE"));
          if (!text && !goals.length && !usesRoot) continue;
          let rootId = "";
          if (text) {
            const taken = new Set(goals.map((g) => g.id));
            let n = 1; while (taken.has("G" + n)) n++;
            rootId = "G" + n;
            const old = goals.filter((g) => !g.parent);
            goals.unshift({ id: rootId, title: text, links: [] });
            old.forEach((g) => (g.parent = rootId));
          } else rootId = goals.find((g) => !g.parent)?.id ?? "";
          for (const c of crits) c.serves = (c.serves ?? []).flatMap((x) => (x === "PURPOSE" ? (rootId ? [rootId] : []) : [x]));
        }
        return s as never;
      },
      // Runs on every load, after any migration.
      // Write the repaired data back once loaded, so storage matches what is shown.
      onRehydrateStorage: () => () => { setTimeout(() => useStore.setState({}), 0); },
      merge: (persisted, current) => {
        const s = { ...current, ...(persisted as Partial<AppStore>) };
        for (const p of Object.values(s.projects ?? {})) repairProject(p);
        if (!s.projects[s.activeId]) s.activeId = s.order.find((id) => s.projects[id]) ?? Object.keys(s.projects)[0];
        s.order = s.order.filter((id) => s.projects[id]);
        return s;
      },
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ lang: s.lang, projects: s.projects, order: s.order, activeId: s.activeId,
        ui: { ...s.ui, flash: undefined } }),
    },
  ),
);

export const useProject = (): Project => useStore((s) => s.projects[s.activeId] ?? s.projects[s.order[0]]);
