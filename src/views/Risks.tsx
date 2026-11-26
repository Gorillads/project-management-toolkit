import { useState } from "react";
import type { Assumption, Lens, Risk } from "../model/types";
import { tv } from "../i18n";
import { ASSUMPTION_KINDS, ASSUMPTION_STATUSES, RISK_STATUSES } from "../data/catalog";
import { uid } from "../data/projects";
import { nextId, openIssueOf, piQuad, pScore, score, toggleIssue } from "../lib/links";
import { Backlinks, Chip, ItemEditor, ScoreSelect, Sev, Status, ViewHead, rowClass, useApp, useGoto, type Field } from "../components/ui";
import { Register } from "../components/Register";
import { RiskHeat, dimName, rScope } from "../components/Charts";
import { ScoreProfile } from "./Stakeholders";
import { groupOpts, opts } from "./Registers";

function IssueToggle({ r, label }: { r: Risk; label?: boolean }) {
  const { p, T, lang, update } = useApp();
  const iss = openIssueOf(p, r.id);
  return (
    <button type="button" className="issue-tg" aria-pressed={!!iss} title={iss ? `${T.isIssue}: ${iss.id}` : T.markIssue}
      onClick={(e) => { e.stopPropagation(); update((pp) => toggleIssue(pp, r.id, lang)); }}>
      ⚑{label ? " " + (iss ? T.isIssue : T.markIssue) : iss ? " " + iss.id : ""}
    </button>
  );
}

function Detail({ r, lens }: { r: Risk; lens?: Lens }) {
  const { p, lang, T } = useApp();
  const goto = useGoto();
  const fields: Field[] = [
    { k: "title", label: T.tri.whatHappens, type: "text" },
    { k: "cause", label: T.tri.cause, type: "textarea" },
    { k: "consequence", label: T.tri.consequenceText, type: "textarea" },
    { k: "cat", label: T.category, type: "select", options: groupOpts(p.rCats, lang) },
    { k: "status", label: T.status, type: "select", options: opts(RISK_STATUSES, lang) },
    { k: "owner", label: T.owner, type: "ref", only: ["people"] },
    { k: "mit", label: T.mitigation, type: "textarea" },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  const iss = openIssueOf(p, r.id);
  return (
    <div className="detail">
      <div className="card-head flat"><div><span className="id">{r.id} · {tv(lang, r.cat)}</span><h4>{r.title || "…"}</h4></div><IssueToggle r={r} label /></div>
      <div className="kv">
        {lens && <><span className="dt">{T.thisLens}</span><span>{r.sc[lens.y]} × {r.sc[lens.x]} = <Sev s={score(r, lens.x, lens.y)} /></span></>}
        <span className="dt">{T.classicPI}</span><span>{r.sc.p} × {r.sc.i} = {pScore(r)}</span>
        {iss && <><span className="dt">{T.issueFlag}</span><span><Chip id={iss.id} full /></span></>}
      </div>
      <div className="sub-h">{T.involved}</div>
      <div className="linked-list">
        {r.links.filter((id) => id.startsWith("S")).map((id) => {
          const s = p.stakeholders.find((x) => x.id === id);
          return s && <button key={id} type="button" className="linked-row" onClick={() => goto(id)}><span className="id">{id}</span><span className="grow">{s.title} <span className="muted">· {tv(lang, s.type)}</span></span><span className="muted small">{T.quads[piQuad(s)]}</span></button>;
        })}
      </div>
      <div className="sub-h">{T.profile}</div>
      <ScoreProfile kind="R" id={r.id} sc={r.sc} hl={lens ? [lens.x, lens.y] : []} />
      <div className="sub-h">{T.alsoIn}</div>
      <Backlinks id={r.id} skip={["S"]} />
      <ItemEditor coll="risks" item={r} fields={fields} />
    </div>
  );
}

function Assumptions() {
  const { lang, T } = useApp();
  const fields: Field[] = [
    { k: "title", label: T.title, type: "text" },
    { k: "kind", label: T.kind, type: "select", options: opts(ASSUMPTION_KINDS, lang) },
    { k: "status", label: T.status, type: "select", options: opts(ASSUMPTION_STATUSES, lang) },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  return (
    <>
      <p className="muted small">{T.assumptionsHint}</p>
      <Register<Assumption> coll="assumptions" fields={fields} make={(id) => ({ id, title: "", kind: "Assumption", status: "Unverified", links: [] })}
        cols={[{ h: T.kind, r: (x) => <span className="badge">{tv(lang, x.kind)}</span> }, { h: T.title, r: (x) => <b>{x.title}</b> }, { h: T.status, r: (x) => <Status v={x.status} /> }]} />
    </>
  );
}

export function RisksView() {
  const { p, lang, T, ui, setUi, update } = useApp();
  const [lensName, setLensName] = useState("");
  const [dimIn, setDimIn] = useState("");
  const sub = ui.rSub;
  const subs = (
    <div className="subtabs">
      <button type="button" className={"subtab" + (sub === "register" ? " active" : "")} onClick={() => setUi({ rSub: "register" })}>{T.register}<span className="count">{p.risks.length}</span></button>
      <button type="button" className={"subtab" + (sub === "assumptions" ? " active" : "")} onClick={() => setUi({ rSub: "assumptions" })}>{T.assumptions}<span className="count">{p.assumptions.length}</span></button>
    </div>
  );
  if (sub === "assumptions") return <><ViewHead id="riskanalysis" />{subs}<Assumptions /></>;

  const l = p.lenses.find((x) => x.id === ui.rCur) ?? p.lenses[0];
  const setL = (fn: (x: Lens) => void) => update((pp) => { const x = pp.lenses.find((y) => y.id === l.id); if (x) fn(x); });
  const selId = ui.sel.risks;
  const sel = p.risks.find((r) => r.id === selId);
  const pick = (id: string) => setUi({ sel: { ...ui.sel, risks: id }, flash: undefined });
  const add = () => {
    const id = nextId(p, "risks");
    update((pp) => { pp.risks.push({ id, title: "", cat: "", cause: "", consequence: "", mit: "", status: "Open", links: [], sc: { ...Object.fromEntries(pp.rDims.map((d) => [d.id, 3])), fin: 0, sched: 0, res: 0 } }); });
    pick(id);
  };
  const pin = (id: string) => update((pp) => { const x = pp.lenses.find((y) => y.id === id)!; x.pinned = !x.pinned; });
  const toolbar = (
    <div className="toolbar">
      <div className="seg small">{(["one", "compare"] as const).map((m) => <button key={m} type="button" className={ui.rMode === m ? "active" : ""} onClick={() => setUi({ rMode: m })}>{m === "one" ? T.oneLens : T.compareLenses}</button>)}</div>
      <button type="button" className="btn small" onClick={add}>+ {T.add}</button>
    </div>
  );
  const detail = <div className="card">{sel ? <Detail r={sel} lens={ui.rMode === "one" ? l : undefined} /> : <div className="empty">{T.selectHint}</div>}</div>;

  if (ui.rMode === "compare") {
    return (
      <>
        <ViewHead id="riskanalysis" />{subs}{toolbar}
        <div className="compare">
          {p.lenses.map((x) => (
            <div className="card mini" key={x.id}>
              <div className="card-head"><div><h3>{x.name}</h3><span className="muted small">{dimName(p, "R", x.y, lang)} × {dimName(p, "R", x.x, lang)}{x.sCat ? " · " + tv(lang, x.sCat) : ""}</span></div>
                <button type="button" className="pin" aria-pressed={!!x.pinned} onClick={() => pin(x.id)}>★</button></div>
              <RiskHeat l={x} selected={selId} onPick={pick} />
            </div>
          ))}
        </div>
        {detail}
      </>
    );
  }
  const inScope = rScope(p, l);
  const sc = (r: Risk) => score(r, l.x, l.y);
  const dimOpts = p.rDims.map((d) => <option key={d.id} value={d.id}>{d.name[lang]}</option>);
  return (
    <>
      <ViewHead id="riskanalysis" />{subs}{toolbar}
      <div className="card controls">
        <div className="ctrl"><span className="lbl">{T.lensLbl}</span>
          <div className="analysis-tabs">{p.lenses.map((x) => (
            <div key={x.id} className={"atab" + (x.id === l.id ? " active" : "")}>
              <button type="button" className="analysis-tab" onClick={() => setUi({ rCur: x.id })}>{x.name}<small>{dimName(p, "R", x.y, lang)} × {dimName(p, "R", x.x, lang)}</small></button>
              <button type="button" className="pin" aria-pressed={!!x.pinned} onClick={() => pin(x.id)}>★</button>
            </div>
          ))}</div>
        </div>
        <div className="ctrl-row">
          <div className="ctrl"><label htmlFor="ry">{T.yAxis}</label><select id="ry" className="sel" value={l.y} onChange={(e) => setL((x) => { x.y = e.target.value; })}>{dimOpts}</select></div>
          <button type="button" className="swap" title={T.swap} onClick={() => setL((x) => { [x.x, x.y] = [x.y, x.x]; })}>⇄</button>
          <div className="ctrl"><label htmlFor="rx">{T.xAxis}</label><select id="rx" className="sel" value={l.x} onChange={(e) => setL((x) => { x.x = e.target.value; })}>{dimOpts}</select></div>
          <div className="ctrl"><label htmlFor="rs">{T.onlyTouching}</label><select id="rs" className="sel" value={l.sCat} onChange={(e) => setL((x) => { x.sCat = e.target.value; })}><option value="">{T.anyStakeholder}</option>{p.sCats.map((c) => <option key={c} value={c}>{tv(lang, c)}</option>)}</select></div>
        </div>
        <div className="ctrl"><span className="lbl">{T.riskCats} ({inScope.length}/{p.risks.length})</span>
          <div className="pills">{p.rCats.map((c) => <button key={c} type="button" className={"pill" + (l.cats.includes(c) ? " on" : "")} onClick={() => setL((x) => { x.cats = x.cats.includes(c) ? x.cats.filter((y) => y !== c) : [...x.cats, c]; })}>{tv(lang, c)} <span className="muted">{p.risks.filter((r) => r.cat === c).length}</span></button>)}</div>
        </div>
        <div className="ctrl-row">
          <div className="ctrl grow"><label htmlFor="ra-name">{T.saveLens}</label><input id="ra-name" className="input" placeholder={T.saveLensPh} value={lensName} onChange={(e) => setLensName(e.target.value)} /></div>
          <button type="button" className="btn small" onClick={() => {
            const id = uid("ln");
            update((pp) => { pp.lenses.push({ ...structuredClone(l), id, name: lensName.trim() || `${dimName(p, "R", l.y, lang)} × ${dimName(p, "R", l.x, lang)}`, pinned: false }); });
            setUi({ rCur: id }); setLensName("");
          }}>{T.save}</button>
          <div className="ctrl grow"><label htmlFor="rd-name">{T.addDim}</label><input id="rd-name" className="input" placeholder={T.addDimPh} value={dimIn} onChange={(e) => setDimIn(e.target.value)} /></div>
          <button type="button" className="btn ghost small" disabled={!dimIn.trim()} onClick={() => {
            const id = uid("d"); const n = dimIn.trim();
            update((pp) => { pp.rDims.push({ id, name: { en: n, da: n } }); pp.risks.forEach((r) => (r.sc[id] = 3)); const x = pp.lenses.find((y) => y.id === l.id); if (x) x.x = id; });
            setDimIn("");
          }}>{T.add}</button>
          {p.lenses.length > 1 && <button type="button" className="btn ghost small danger-text" onClick={() => { if (window.confirm(T.deleteAnalysis + "?")) { update((pp) => { pp.lenses = pp.lenses.filter((x) => x.id !== l.id); }); setUi({ rCur: p.lenses.find((x) => x.id !== l.id)!.id }); } }}>{T.deleteAnalysis}</button>}
        </div>
      </div>
      <div className="grid-2">
        <div className="card"><h3>{l.name}</h3><div className="scroll-x"><table>
          <thead><tr><th>{T.id}</th><th>{T.title}</th><th>{dimName(p, "R", l.y, lang)}</th><th>{dimName(p, "R", l.x, lang)}</th><th>Score</th><th>{T.issueFlag}</th><th>{T.links}</th></tr></thead>
          <tbody>{[...inScope].sort((a, b) => sc(b) - sc(a)).map((r) => (
            <tr key={r.id} data-row={r.id} className={rowClass(selId === r.id, ui.flash === r.id)} onClick={() => pick(r.id)}>
              <td><span className="id">{r.id}</span></td>
              <td><b>{r.title || "…"}</b><div className="cat">{tv(lang, r.cat)} · {tv(lang, r.status)}</div></td>
              {[l.y, l.x].map((k) => <td key={k}><ScoreSelect label={k} value={r.sc[k] ?? 1} onChange={(v) => update((pp) => { pp.risks.find((z) => z.id === r.id)!.sc[k] = v; })} /></td>)}
              <td><Sev s={sc(r)} /></td>
              <td><IssueToggle r={r} /></td>
              <td><div className="chips">{r.links.map((id) => <Chip key={id} id={id} />)}</div></td>
            </tr>
          ))}</tbody>
        </table></div><p className="muted small">{T.scoresEditable}</p></div>
        <div className="stack">
          <div className="card"><h3>{dimName(p, "R", l.y, lang)} × {dimName(p, "R", l.x, lang)}</h3><RiskHeat l={l} selected={selId} onPick={pick} /><p className="muted small">{T.issueEdge}</p></div>
          {detail}
        </div>
      </div>
    </>
  );
}
