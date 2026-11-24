import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { Lang, Project } from "../model/types";
import { exampleProject, projectFromTemplate } from "../data/projects";

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
}

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
      canUndo: false,
      canRedo: false,
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ lang: s.lang, projects: s.projects, order: s.order, activeId: s.activeId,
        ui: { ...s.ui, flash: undefined } }),
    },
  ),
);

export const useProject = (): Project => useStore((s) => s.projects[s.activeId] ?? s.projects[s.order[0]]);
