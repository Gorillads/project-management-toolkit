import { useState } from "react";
import type { SwotItem } from "../model/types";
import { tv } from "../i18n";
import { ALWAYS_ON, TOOLS } from "../data/catalog";
import { TEMPLATES, tplById } from "../data/templates";
import { uid } from "../data/projects";
import { indexOf, openIssueOf, piQuad, pScore, sev } from "../lib/links";
import { Chip, LinkEditor, ViewHead, useApp } from "../components/ui";
import { Network, RiskHeat, StakeholderGrid } from "../components/Charts";
import { PhaseFlow } from "./Registers";
import { useStore } from "../state/store";

export function useSummaries() {
  const { p, lang, T } = useApp();
  const open = p.issues.filter((i) => i.status !== "Closed");
  const high = p.risks.filter((r) => sev(pScore(r)) === "high").length;
  const today = new Date().toISOString().slice(0, 10);
  const next = [...p.milestones].filter((m) => !m.done).sort((a, b) => a.date.localeCompare(b.date))[0];
  const days = next ? Math.round((+new Date(next.date) - +new Date(today)) / 864e5) : 0;
  const tot = (k: "plan" | "fc") => p.budget.reduce((a, b) => a + b[k], 0);
  const tpl = tplById(p.templateId);
  const fmt = (n: number) => n.toLocaleString(lang === "da" ? "da-DK" : "en-GB");
  const da = lang === "da";
  const decidedTpl = p.decisions.filter((d) => d.tpl).length;
  const gaps = p.stakeholders.filter((s) => (s.engDesired ?? 3) > (s.engCurrent ?? 2)).length;
  const s: Record<string, [string, string]> = {
    templates: [tpl.name[lang], `${da ? "Fase" : "Phase"} ${p.phase + 1}/${tpl.phases.length}: ${tpl.phases[p.phase]?.[0][lang] ?? ""}`],
    charter: [p.charter.goLive ? `${T.goLive}: ${p.charter.goLive}` : T.empty, p.charter.budgetNote],
    stakeholders: [`${p.stakeholders.length} ${T.tools.stakeholders.toLowerCase()}`, `${p.stakeholders.filter((x) => x.type === "Internal").length} ${T.internal.toLowerCase()}, ${p.stakeholders.filter((x) => x.type === "External").length} ${T.external.toLowerCase()} · ${p.analyses.length} ${T.analysis.toLowerCase()}`],
    risks: [`${p.risks.length} ${T.tools.risks.toLowerCase()}, ${high} ${T.statHigh}`, `${p.risks.filter((r) => openIssueOf(p, r.id)).length} ⚑ · ${p.assumptions.length} ${T.assumptions.toLowerCase()}`],
    issues: [`${open.length} ${da ? "åbne" : "open"}`, `${open.filter((i) => i.prio === "High").length} ${T.high.toLowerCase()}`],
    decisions: [`${p.decisions.length} ${da ? "beslutninger" : "decisions"}`, `${Math.max(0, tpl.decisions.length - decidedTpl)} ${da ? "typiske forude" : "typical still ahead"}`],
    changes: [`${p.changes.length}`, `${p.changes.filter((c) => c.status === "Under review").length} ${tv(lang, "Under review").toLowerCase()}`],
    wbs: [`${p.wbs.length} ${da ? "arbejdspakker" : "work packages"}`, `${p.wbs.length ? Math.round(p.wbs.reduce((a, w) => a + (w.progress ?? 0), 0) / p.wbs.length) : 0}% ${da ? "i snit" : "on average"}`],
    schedule: [next ? next.title : T.empty, next ? `${da ? "om" : "in"} ${days} ${da ? "dage" : "days"} · ${p.milestones.filter((m) => m.done).length}/${p.milestones.length}` : ""],
    board: [`${p.tasks.filter((x) => x.col !== "done").length} ${da ? "åbne opgaver" : "open tasks"}`, `${p.tasks.filter((x) => x.col === "doing").length} ${T.doing.toLowerCase()}`],
    budget: [`${T.forecast} ${fmt(tot("fc"))}k ${p.currency}`, `${tot("fc") - tot("plan") > 0 ? "+" : ""}${fmt(tot("fc") - tot("plan"))}k ${T.vsPlan} · ${p.files.length} ${da ? "filer" : "files"}`],
    people: [`${p.people.length} ${da ? "personer" : "people"}`, `${p.people.filter((x) => x.group === "Project team").length} ${tv(lang, "Project team").toLowerCase()}`],
    raci: [`${p.raci.length} ${da ? "opgaver" : "tasks"}`, `${p.raciPeople.length} ${da ? "personer" : "people"}`],
    engagement: [`${gaps} ${da ? "afstande at lukke" : "gaps to close"}`, ""],
    comms: [`${p.stakeholders.length} ${T.tools.stakeholders.toLowerCase()}`, `${p.stakeholders.filter((x) => piQuad(x) === "hh").length} ${T.quads.hh.toLowerCase()}`],
    swot: [`${p.swot.t.length} ${T.threats.toLowerCase()}`, `${p.swot.o.length} ${T.opportunities.toLowerCase()}`],
    benefits: [`${p.benefits.length}`, ""],
    lessons: [`${p.lessons.length}`, ""],
  };
  return s;
}

export function OverviewView() {
  const { p, lang, T, go, update, setUi } = useApp();
  const [cat, setCat] = useState("");
  const sum = useSummaries();
  const links = [...indexOf(p).refs.values()].reduce((a, s) => a + s.size, 0) / 2;
  const groups = [...new Set(TOOLS.map((t) => t.group))];
  return (
    <>
      <div className="view-head">
        <div>
          <input className="title-input" aria-label={T.projectName} value={p.name} onChange={(e) => update((pp) => { pp.name = e.target.value; })} />
          <input className="sub-input" aria-label={T.organisation} placeholder={T.organisation} value={p.org} onChange={(e) => update((pp) => { pp.org = e.target.value; })} />
          <p>{T.blurbs.overview}</p>
        </div>
      </div>
      {p.id === "example" && <div className="card small note">{T.exampleNote}</div>}
      <div className="stats">
        <div className="stat"><div className="v">{p.stakeholders.length}</div><div className="l">{T.statStakeholders}, {p.people.length} {T.statPeople}</div></div>
        <div className="stat"><div className="v">{p.risks.length}</div><div className="l">{T.statRisks}, {p.risks.filter((r) => sev(pScore(r)) === "high").length} {T.statHigh}</div></div>
        <div className="stat"><div className="v">{p.issues.filter((i) => i.status !== "Closed").length}</div><div className="l">{T.statIssues}</div></div>
        <div className="stat"><div className="v">{links}</div><div className="l">{T.statLinks}</div></div>
      </div>
      <div className="card">
        <div className="card-head"><h3>{tplById(p.templateId).name[lang]}</h3><span className="muted small">{T.currentPhase}</span></div>
        <PhaseFlow templateId={p.templateId} phase={p.phase} onPick={(i) => update((pp) => { pp.phase = i; })} />
      </div>
      <div className="card">
        <div className="card-head"><h3>{T.pinned}</h3><span className="muted small">{T.pinHint}</span></div>
        <div className="compare">
          {p.analyses.filter((a) => a.pinned).map((a) => (
            <div key={a.id} className="card mini"><div className="card-head"><h3>{a.name}</h3><button type="button" className="btn ghost small" onClick={() => { setUi({ sCur: a.id, sMode: "analysis" }); go("stakeholders"); }}>{T.open}</button></div><StakeholderGrid a={a} mini /></div>
          ))}
          {p.lenses.filter((l) => l.pinned).map((l) => (
            <div key={l.id} className="card mini"><div className="card-head"><h3>{l.name}</h3><button type="button" className="btn ghost small" onClick={() => { setUi({ rCur: l.id, rMode: "one", rSub: "register" }); go("risks"); }}>{T.open}</button></div><RiskHeat l={l} /></div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>{T.atAGlance}</h3>
        <div className="dash">
          {TOOLS.filter((t) => t.id !== "overview" && p.enabled.includes(t.id)).map((t) => (
            <button key={t.id} type="button" className="dash-tile" onClick={() => go(t.id)}>
              <span className="g">{T.groups[t.group]}</span><b>{T.tools[t.id]}</b>
              <span className="v">{sum[t.id]?.[0]}</span><span className="s">{sum[t.id]?.[1]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div><h3>{T.network}</h3><p className="muted small m0">{T.networkHint}</p></div>
          <div className="ctrl"><label htmlFor="netcat">{T.showStakeholders}</label><select id="netcat" className="sel" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">{T.allGroups}</option>{p.sCats.map((c) => <option key={c} value={c}>{tv(lang, c)}</option>)}</select></div></div>
        <div className="scroll-x"><Network cat={cat} /></div>
      </div>
      <div className="card">
        <details>
          <summary><h3 className="inline">{T.library}</h3> <span className="muted small">· {p.enabled.length}/{TOOLS.length} {T.inUse}. {T.libraryHint}</span></summary>
          <div className="tool-map">
            {groups.map((g) => [
              <div key={g} className="group-h">{T.groups[g]}</div>,
              ...TOOLS.filter((t) => t.group === g && !ALWAYS_ON.includes(t.id)).map((t) => (
                <label key={t.id} className={"tool-tile" + (p.enabled.includes(t.id) ? "" : " off")}>
                  <span>{T.tools[t.id]}{t.optional && <span className="muted small"> ({T.optional})</span>}</span>
                  <input type="checkbox" checked={p.enabled.includes(t.id)} onChange={(e) => update((pp) => { pp.enabled = e.target.checked ? [...pp.enabled, t.id] : pp.enabled.filter((x) => x !== t.id); })} />
                </label>
              )),
            ])}
          </div>
        </details>
      </div>
    </>
  );
}

export function TemplatesView() {
  const { p, lang, T, update } = useApp();
  const openWizard = useStore((s) => s.openWizard);
  const [view, setView] = useState(p.templateId);
  const v = tplById(view);
  return (
    <>
      <ViewHead id="templates" />
      <div className="tpl-grid">
        <div className="tpl-list">
          {TEMPLATES.map((x) => (
            <button key={x.id} type="button" className={"tpl" + (x.id === v.id ? " active" : "")} onClick={() => setView(x.id)}>
              <b>{x.name[lang]}</b><small>{x.desc[lang]}</small>{x.id === p.templateId && <span className="badge sev low self-start">{T.usedByProject}</span>}
            </button>
          ))}
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-head"><h3>{v.name[lang]}: {T.workflow}</h3>
              <div className="row-gap">
                {v.id !== p.templateId && <button type="button" className="btn ghost small" onClick={() => update((pp) => { pp.templateId = v.id; pp.phase = 0; })}>{T.useTemplate}</button>}
                <button type="button" className="btn small" onClick={() => openWizard(v.id)}>{T.newFromTemplate}</button>
              </div></div>
            <PhaseFlow templateId={v.id} phase={v.id === p.templateId ? p.phase : 0} />
            <p className="muted small">{T.gateNote}</p>
          </div>
          <div className="two">
            <div className="card"><h3>{T.typicalDecisions}</h3><ul className="plain-list">{v.decisions.map((d) => <li key={d.en}>{d[lang]}</li>)}</ul></div>
            <div className="card"><h3>{T.typicalRisks}</h3><ul className="plain-list">{v.risks.map(([d]) => <li key={d.en}>{d[lang]}</li>)}</ul></div>
            <div className="card"><h3>{T.typicalGroups}</h3><div className="pills">{v.groups.map(([g]) => <span key={g.en} className="badge">{g[lang]}</span>)}</div></div>
            <div className="card"><h3>{T.recommendedTools}</h3><div className="pills">{v.tools.map((x) => <span key={x} className="badge">{T.tools[x]}</span>)}</div>
              <button type="button" className="btn ghost small mt" onClick={() => update((pp) => { pp.enabled = [...ALWAYS_ON, ...v.tools]; })}>{T.useToolSet}</button></div>
          </div>
        </div>
      </div>
    </>
  );
}

export function CharterView() {
  const { p, T, update } = useApp();
  const field = (k: "purpose" | "inScope" | "outScope" | "budgetNote", label: string, wide?: boolean) => (
    <div className={"box" + (wide ? " wide" : "")}>
      <label className="sub-h m0" htmlFor={"ch-" + k}>{label}</label>
      <textarea id={"ch-" + k} className="input" rows={wide ? 3 : 4} value={p.charter[k]} onChange={(e) => update((pp) => { pp.charter[k] = e.target.value; })} />
    </div>
  );
  return (
    <>
      <ViewHead id="charter" />
      <div className="canvas">
        {field("purpose", T.purpose, true)}
        {field("inScope", T.inScope)}
        {field("outScope", T.outScope)}
        {field("budgetNote", T.budgetNote)}
        <div className="box"><label className="sub-h m0" htmlFor="ch-go">{T.goLive}</label><input id="ch-go" type="date" className="input" value={p.charter.goLive} onChange={(e) => update((pp) => { pp.charter.goLive = e.target.value; })} /></div>
        <div className="box wide2"><span className="sub-h m0">{T.charterLinks}</span><LinkEditor ids={p.charter.links} onChange={(ids) => update((pp) => { pp.charter.links = ids; })} /></div>
        <div className="box wide"><span className="sub-h m0">{T.tools.risks}: {T.high}</span><div className="chips">{p.risks.filter((r) => sev(pScore(r)) === "high").map((r) => <Chip key={r.id} id={r.id} full />)}</div></div>
      </div>
    </>
  );
}

export function SwotView() {
  const { p, T, update } = useApp();
  const box = (k: "s" | "w" | "o" | "t", title: string) => (
    <div className="q" key={k}>
      <div className="card-head"><span className="sub-h m0">{title}</span><button type="button" className="btn ghost small" onClick={() => update((pp) => { pp.swot[k].push({ id: uid("sw"), text: "", links: [] }); })}>+ {T.addEntry}</button></div>
      {p.swot[k].map((it: SwotItem) => (
        <div key={it.id} className="swot-item">
          <div className="row-gap">
            <input className="input grow" aria-label={title} value={it.text} onChange={(e) => update((pp) => { pp.swot[k].find((x) => x.id === it.id)!.text = e.target.value; })} />
            <button type="button" className="icon-x" aria-label={T.del} onClick={() => update((pp) => { pp.swot[k] = pp.swot[k].filter((x) => x.id !== it.id); })}>×</button>
          </div>
          <LinkEditor ids={it.links} onChange={(ids) => update((pp) => { pp.swot[k].find((x) => x.id === it.id)!.links = ids; })} />
        </div>
      ))}
    </div>
  );
  return (
    <>
      <ViewHead id="swot" />
      <div className="swot">{box("s", T.strengths)}{box("w", T.weaknesses)}{box("o", T.opportunities)}{box("t", T.threats)}</div>
    </>
  );
}
