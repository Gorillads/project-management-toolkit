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
      setActive: (id) => set({ activeId: id, ui: { ...get().ui, sel: {}, flash: undefined } }),
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
        set({ projects: { ...projects, [activeId]: draft } });
      },
      replaceActive: (p) => {
        const { activeId, projects } = get();
        set({ projects: { ...projects, [activeId]: { ...p, id: activeId } } });
      },
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
