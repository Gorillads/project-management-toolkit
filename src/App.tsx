import { useEffect, useRef, useState, type ReactNode } from "react";
import "./App.css";
import { MAX_PROJECTS, useProject, useStore } from "./state/store";
import { t } from "./i18n";
import { ALWAYS_ON, TOOLS } from "./data/catalog";
import { buildDeck, downloadBlob, importCsv, parseProjectJson, projectCsv, projectJson } from "./lib/exporters";
import { slug } from "./views/Planning";
import { Search } from "./components/Search";
import { Guide } from "./components/Guide";
import { NewProjectWizard } from "./components/NewProjectWizard";
import { OverviewView, TemplatesView, CharterView, SwotView } from "./views/ProjectViews";
import { StakeholdersView } from "./views/Stakeholders";
import { RisksView } from "./views/Risks";
import { ActorsView, RisksCoreView } from "./views/Core";
import { PurposeView } from "./views/Purpose";
import { IssuesView, ChangesView, BenefitsView, LessonsView } from "./views/Registers";
import { DecisionsView } from "./views/Decisions";
import { WbsView, ScheduleView, BoardView, BudgetView } from "./views/Planning";
import { PeopleView, RaciView, EngagementView, CommsView } from "./views/PeopleViews";

const VIEWS: Record<string, () => ReactNode> = {
  overview: OverviewView, templates: TemplatesView, charter: CharterView, purpose: PurposeView, actors: ActorsView, stakeholders: StakeholdersView, risks: RisksCoreView, riskanalysis: RisksView,
  issues: IssuesView, decisions: DecisionsView, changes: ChangesView, wbs: WbsView, schedule: ScheduleView, board: BoardView,
  budget: BudgetView, people: PeopleView, raci: RaciView, engagement: EngagementView, comms: CommsView, swot: SwotView,
  benefits: BenefitsView, lessons: LessonsView,
};
const REPO = "https://github.com/Gorillads/project-management-toolkit";

function TabBar({ onHelp }: { onHelp: () => void }) {
  const { lang, projects, order, activeId, setActive, close, duplicate, openWizard } = useStore();
  const T = t(lang);
  const full = order.length >= MAX_PROJECTS;
  return (
    <div className="tab-bar">
      <div className="tab-items" role="tablist">
        {order.map((id) => (
          <div key={id} role="tab" aria-selected={id === activeId} className={"tab-item" + (id === activeId ? " active" : "")} onClick={() => setActive(id)}>
            <span className="tab-label">{projects[id]?.name || T.newProject}</span>
            {order.length > 1 && <button type="button" className="tab-x" aria-label={T.closeProject} onClick={(e) => { e.stopPropagation(); if (window.confirm(T.confirmClose)) close(id); }}>×</button>}
          </div>
        ))}
      </div>
      <div className="tab-actions">
        <button type="button" className="icon-btn" title={T.help} aria-label={T.help} onClick={onHelp}>?</button>
        <button type="button" className="icon-btn" title={T.duplicate} aria-label={T.duplicate} disabled={full} onClick={duplicate}>⧉</button>
        <button type="button" className="icon-btn" title={T.newProject} aria-label={T.newProject} disabled={full} onClick={() => openWizard()}>+</button>
      </div>
    </div>
  );
}

function ExportMenu() {
  const lang = useStore((s) => s.lang);
  const p = useProject();
  const replaceActive = useStore((s) => s.replaceActive);
  const addProject = useStore((s) => s.addProject);
  const T = t(lang);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const jsonIn = useRef<HTMLInputElement>(null);
  const csvIn = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [open]);
  const name = slug(p.name);
  const run = async (kind: string) => {
    try {
      if (kind === "json") downloadBlob(projectJson(p), `${name}.json`, "application/json");
      if (kind === "csv") downloadBlob(projectCsv(p), `${name}.csv`, "text/csv");
      if (kind === "pptx") { setMsg(T.building); downloadBlob(await buildDeck(p, lang), `${name}.pptx`); }
      setMsg(T.saved);
    } catch (e) { setMsg(String((e as Error).message ?? e)); }
  };
  const readFile = (f: File, fn: (text: string) => void) => { const r = new FileReader(); r.onload = () => { try { fn(String(r.result)); } catch (e) { setMsg(`${T.importFailed}: ${(e as Error).message}`); } }; r.readAsText(f); };
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>{T.exportLabel} / {T.importLabel} ▾</button>
      {open && (
        <div className="menu-pop right">
          <button type="button" className="menu-item" onClick={() => run("pptx")}><span>{T.exportPptx}</span><small>{T.exportPptxHint}</small></button>
          <button type="button" className="menu-item" onClick={() => run("csv")}><span>{T.exportCsv}</span><small>{T.exportCsvHint}</small></button>
          <button type="button" className="menu-item" onClick={() => run("json")}><span>{T.exportJson}</span><small>{T.exportJsonHint}</small></button>
          <hr />
          <button type="button" className="menu-item" onClick={() => jsonIn.current?.click()}><span>{T.importJson}</span></button>
          <button type="button" className="menu-item" onClick={() => csvIn.current?.click()}><span>{T.importCsv}</span></button>
          <input ref={jsonIn} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, (txt) => { const np = parseProjectJson(txt); addProject(np); setMsg(`${T.importDone}: ${np.name}`); }); e.target.value = ""; }} />
          <input ref={csvIn} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, (txt) => { const draft = structuredClone(p); const res = importCsv(draft, txt); replaceActive(draft); setMsg(`${T.importDone}: ${res.rows} (${res.registers.join(", ")})`); }); e.target.value = ""; }} />
          {msg && <div className="menu-status" role="status">{msg}</div>}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const ui = useStore((s) => s.ui);
  const go = useStore((s) => s.go);
  const p = useProject();
  const T = t(lang);
  const { undo, redo, canUndo, canRedo, wizard, closeWizard } = useStore();
  const [guide, setGuide] = useState(() => { try { return !localStorage.getItem("pmt-guide-seen"); } catch { return false; } });
  const closeGuide = () => { setGuide(false); try { localStorage.setItem("pmt-guide-seen", "1"); } catch { /* private mode */ } };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return; // keep the field's own undo
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" && e.key.toLowerCase() !== "y") return;
      e.preventDefault();
      if (e.key.toLowerCase() === "y" || e.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo]);
  useEffect(() => { document.documentElement.lang = lang; document.title = T.appName; }, [lang, T.appName]);
  useEffect(() => {
    const read = () => { const v = location.hash.slice(1); if (v && VIEWS[v] && v !== useStore.getState().ui.view) go(v); };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [go]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [ui.view, p.id]);
  const view = VIEWS[ui.view] ? ui.view : "overview";
  const View = VIEWS[view];
  let g = "";
  return (
    <div className="app">
      <TabBar onHelp={() => setGuide(true)} />
      <Guide open={guide} onClose={closeGuide} />
      <NewProjectWizard open={wizard.open} templateId={wizard.templateId} onClose={closeWizard} />
      <header className="app-header">
        <div><h1>{T.appName}</h1><div className="sub">{T.tagline}</div></div>
        <div className="header-controls">
          <Search />
          <div className="seg" role="group" aria-label={T.undo}>
            <button type="button" title={`${T.undo} (Ctrl+Z)`} aria-label={T.undo} disabled={!canUndo} onClick={undo}>↶</button>
            <button type="button" title={`${T.redo} (Ctrl+Shift+Z)`} aria-label={T.redo} disabled={!canRedo} onClick={redo}>↷</button>
          </div>
          <div className="seg" role="group" aria-label="Language">
            {(["da", "en"] as const).map((l) => <button key={l} type="button" className={lang === l ? "active" : ""} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
          </div>
          <ExportMenu />
        </div>
      </header>
      <div className="app-body">
        <nav className="sidebar" aria-label="Tools">
          <div className="nav-group">
            {TOOLS.filter((x) => ALWAYS_ON.includes(x.id) || p.enabled.includes(x.id)).map((x) => {
              const label = x.group !== g ? (g = x.group, <div key={"g" + x.group} className="nav-label">{T.groups[x.group]}</div>) : null;
              const count = x.id === "issues" ? p.issues.filter((i) => i.status !== "Closed").length
                : x.id === "actors" ? p.stakeholders.length + p.people.length : x.id === "risks" ? p.risks.length : 0;
              return [label, (
                <button key={x.id} type="button" className={"nav-btn" + (view === x.id ? " active" : "")} aria-current={view === x.id ? "page" : undefined} onClick={() => go(x.id)}>
                  <span>{T.tools[x.id]}</span>{count > 0 && <span className="count">{count}</span>}
                </button>
              )];
            })}
          </div>
          <div className="side-foot"><p>{T.footer}</p><a href={REPO} target="_blank" rel="noreferrer">{T.github}</a></div>
        </nav>
        <main key={p.id + view}><View /></main>
      </div>
    </div>
  );
}
