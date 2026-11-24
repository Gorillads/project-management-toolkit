import { useState } from "react";
import type { Analysis, Stakeholder } from "../model/types";
import { tv } from "../i18n";
import { nextId, peopleFor, pScore, risksFor, sev } from "../lib/links";
import { uid } from "../data/projects";
import { Backlinks, Chip, ItemEditor, ScoreSelect, Sev, ViewHead, rowClass, useApp, useGoto, type Field } from "../components/ui";
import { StakeholderGrid, dimName } from "../components/Charts";
import { opts } from "./Registers";

export function ScoreProfile({ kind, id, sc, hl }: { kind: "S" | "R"; id: string; sc: Record<string, number>; hl: string[] }) {
  const { p, lang, update } = useApp();
  const dims = kind === "S" ? p.sDims : p.rDims;
  return (
    <div className="bars">
      {dims.map((d) => (
        <div key={d.id} className={"bar-row" + (hl.includes(d.id) ? " on" : "")}>
          <span className="bar-l">{d.name[lang]}</span>
          <span className="dots">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= (sc[d.id] ?? 0) ? "f" : ""} />)}</span>
          <ScoreSelect label={d.name[lang]} value={sc[d.id] ?? 1} onChange={(v) => update((pp) => {
            const it = (kind === "S" ? pp.stakeholders : pp.risks).find((x) => x.id === id);
            if (it) it.sc[d.id] = v;
          })} />
        </div>
      ))}
    </div>
  );
}

function Detail({ s, hl }: { s: Stakeholder; hl: string[] }) {
  const { p, lang, T } = useApp();
  const goto = useGoto();
  const fields: Field[] = [
    { k: "title", label: T.name, type: "text" },
    { k: "type", label: T.type, type: "select", options: opts(["Internal", "External"], lang) },
    { k: "cat", label: T.group, type: "select", options: opts(p.sCats, lang) },
    { k: "org", label: T.org, type: "text" },
    { k: "need", label: T.need, type: "textarea" },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  const rs = risksFor(p, s.id).sort((a, b) => pScore(b) - pScore(a));
  return (
    <div className="detail">
      <div><span className="id">{s.id} · {tv(lang, s.type)} · {tv(lang, s.cat)}</span><h4>{s.title}</h4></div>
      <div className="kv"><span className="dt">{T.contacts}</span><div className="chips">{peopleFor(p, s.id).map((x) => <Chip key={x.id} id={x.id} />)}{!peopleFor(p, s.id).length && <span className="muted">{T.none}</span>}</div></div>
      <div className="sub-h">{T.linkedRisks} ({rs.length})</div>
      <div className="linked-list">
        {rs.map((r) => <button key={r.id} type="button" className="linked-row" onClick={() => goto(r.id)}><span className="id">{r.id}</span><span className="grow">{r.title}</span><Sev s={pScore(r)} /></button>)}
        {!rs.length && <div className="empty">{T.none}</div>}
      </div>
      <div className="sub-h">{T.profile}</div>
      <ScoreProfile kind="S" id={s.id} sc={s.sc} hl={hl} />
      <div className="sub-h">{T.alsoIn}</div>
      <Backlinks id={s.id} skip={["R", "S", "P"]} />
      <ItemEditor coll="stakeholders" item={s} fields={fields} />
    </div>
  );
}

export function StakeholdersView() {
  const { p, lang, T, ui, setUi, update } = useApp();
  const [saName, setSaName] = useState("");
  const [dimNameIn, setDimNameIn] = useState("");
  const selId = ui.sel.stakeholders;
  const sel = p.stakeholders.find((x) => x.id === selId);
  const pick = (id: string) => setUi({ sel: { ...ui.sel, stakeholders: id }, flash: undefined });
  const a = p.analyses.find((x) => x.id === ui.sCur) ?? p.analyses[0];
  const setA = (fn: (a: Analysis) => void) => update((pp) => { const x = pp.analyses.find((y) => y.id === a.id); if (x) fn(x); });
  const addStakeholder = () => {
    const id = nextId(p, "stakeholders");
    update((pp) => {
      pp.stakeholders.push({ id, title: "", cat: pp.sCats[0], type: "Internal", org: "", need: "", links: [], sc: Object.fromEntries(pp.sDims.map((d) => [d.id, 3])) });
      // An analysis that already covers everyone keeps covering everyone.
      pp.analyses.forEach((an) => { if (p.stakeholders.every((s) => an.ids.includes(s.id))) an.ids.push(id); });
    });
    pick(id);
  };
  const mode = ui.sMode;
  const modeSeg = (
    <div className="toolbar">
      <div className="seg">{(["list", "analysis", "compare"] as const).map((m) => <button key={m} type="button" className={mode === m ? "active" : ""} onClick={() => setUi({ sMode: m })}>{T[m === "list" ? "simpleList" : m]}</button>)}</div>
      <button type="button" className="btn small" onClick={addStakeholder}>+ {T.add}</button>
    </div>
  );
  const detail = <div className="card">{sel ? <Detail s={sel} hl={mode === "analysis" && a ? [a.x, a.y] : []} /> : <div className="empty">{T.selectHint}</div>}</div>;

  if (mode === "list") {
    return (
      <>
        <ViewHead id="stakeholders" />
        {modeSeg}
        <div className="grid-2">
          <div className="card"><div className="scroll-x"><table>
            <thead><tr><th>{T.id}</th><th>{T.name}</th><th>{T.group}</th><th>{T.org}</th><th>{T.contacts}</th><th>{T.risksCol}</th></tr></thead>
            <tbody>
              {(["Internal", "External"] as const).map((ty) => [
                <tr key={ty} className="group-row"><td colSpan={6}>{T[ty === "Internal" ? "internal" : "external"]} · {p.stakeholders.filter((s) => s.type === ty).length}</td></tr>,
                ...p.stakeholders.filter((s) => s.type === ty).map((s) => {
                  const rs = risksFor(p, s.id);
                  return (
                    <tr key={s.id} data-row={s.id} className={rowClass(selId === s.id, ui.flash === s.id)} onClick={() => pick(s.id)}>
                      <td><span className="id">{s.id}</span></td><td><b>{s.title || "…"}</b></td>
                      <td><span className={"badge " + (ty === "Internal" ? "type-int" : "")}>{tv(lang, s.cat)}</span></td>
                      <td className="muted">{s.org}</td>
                      <td><div className="chips">{peopleFor(p, s.id).map((x) => <Chip key={x.id} id={x.id} />)}</div></td>
                      <td>{rs.length ? <span className={"badge sev " + (rs.some((r) => sev(pScore(r)) === "high") ? "high" : "med")}>{rs.length}</span> : <span className="muted small">0</span>}</td>
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table></div></div>
          {detail}
        </div>
      </>
    );
  }
  if (mode === "compare") {
    return (
      <>
        <ViewHead id="stakeholders" />
        {modeSeg}
        <div className="compare">
          {p.analyses.map((x) => (
            <div className="card" key={x.id}>
              <div className="card-head"><div><h3>{x.name}</h3><span className="muted small">{x.scope}</span></div>
                <button type="button" className="pin" aria-pressed={!!x.pinned} title="★" onClick={() => update((pp) => { const y = pp.analyses.find((z) => z.id === x.id)!; y.pinned = !y.pinned; })}>★</button></div>
              <StakeholderGrid a={x} selected={selId} onPick={pick} />
            </div>
          ))}
        </div>
        {detail}
      </>
    );
  }
  if (!a) return null;
  const inScope = p.stakeholders.filter((s) => a.ids.includes(s.id));
  const dimOpts = p.sDims.map((d) => <option key={d.id} value={d.id}>{d.name[lang]}</option>);
  const catOn = (c: string) => { const ids = p.stakeholders.filter((s) => s.cat === c).map((s) => s.id); return ids.length > 0 && ids.every((i) => a.ids.includes(i)); };
  return (
    <>
      <ViewHead id="stakeholders" />
      {modeSeg}
      <div className="card controls">
        <div className="ctrl"><span className="lbl">{T.analysisLbl}</span>
          <div className="analysis-tabs">
            {p.analyses.map((x) => (
              <div key={x.id} className={"atab" + (x.id === a.id ? " active" : "")}>
                <button type="button" className="analysis-tab" onClick={() => setUi({ sCur: x.id })}>{x.name}<small>{x.scope || `${x.ids.length}`}</small></button>
                <button type="button" className="pin" aria-pressed={!!x.pinned} title="★" onClick={() => update((pp) => { const y = pp.analyses.find((z) => z.id === x.id)!; y.pinned = !y.pinned; })}>★</button>
              </div>
            ))}
          </div>
        </div>
        <div className="ctrl-row">
          <div className="ctrl"><label htmlFor="sy">{T.yAxis}</label><select id="sy" className="sel" value={a.y} onChange={(e) => setA((x) => { x.y = e.target.value; })}>{dimOpts}</select></div>
          <button type="button" className="swap" title={T.swap} onClick={() => setA((x) => { [x.x, x.y] = [x.y, x.x]; })}>⇄</button>
          <div className="ctrl"><label htmlFor="sx">{T.xAxis}</label><select id="sx" className="sel" value={a.x} onChange={(e) => setA((x) => { x.x = e.target.value; })}>{dimOpts}</select></div>
          <div className="ctrl"><span className="lbl">{T.grid}</span><div className="seg small">{([2, 5] as const).map((g) => <button key={g} type="button" className={a.grid === g ? "active" : ""} onClick={() => setA((x) => { x.grid = g; })}>{g}×{g}</button>)}</div></div>
        </div>
        <div className="ctrl"><span className="lbl">{T.include} ({inScope.length}/{p.stakeholders.length})</span>
          <div className="pills">{p.sCats.map((c) => (
            <button key={c} type="button" className={"pill" + (catOn(c) ? " on" : "")} onClick={() => setA((x) => {
              const ids = p.stakeholders.filter((s) => s.cat === c).map((s) => s.id);
              x.ids = catOn(c) ? x.ids.filter((i) => !ids.includes(i)) : [...new Set([...x.ids, ...ids])];
            })}>{tv(lang, c)} <span className="muted">{p.stakeholders.filter((s) => s.cat === c).length}</span></button>
          ))}</div>
          <details className="picker"><summary>{T.pickIndividual}</summary>
            <div className="pick-list">{p.sCats.map((c) => [
              <div key={"g" + c} className="pick-group">{tv(lang, c)}</div>,
              ...p.stakeholders.filter((s) => s.cat === c).map((s) => (
                <label key={s.id}><input type="checkbox" checked={a.ids.includes(s.id)} onChange={(e) => setA((x) => { x.ids = e.target.checked ? [...x.ids, s.id] : x.ids.filter((i) => i !== s.id); })} />{s.title}</label>
              )),
            ])}</div>
          </details>
        </div>
        <div className="ctrl-row">
          <div className="ctrl grow"><label htmlFor="sa-name">{T.saveAnalysis}</label><input id="sa-name" className="input" placeholder={T.saveAnalysisPh} value={saName} onChange={(e) => setSaName(e.target.value)} /></div>
          <button type="button" className="btn small" onClick={() => {
            const id = uid("sa");
            update((pp) => { pp.analyses.push({ ...structuredClone(a), id, name: saName.trim() || `${dimName(p, "S", a.y, lang)} / ${dimName(p, "S", a.x, lang)}`, scope: `${a.ids.length}`, pinned: false, quads: undefined }); });
            setUi({ sCur: id }); setSaName("");
          }}>{T.save}</button>
          <div className="ctrl grow"><label htmlFor="sd-name">{T.addDim}</label><input id="sd-name" className="input" placeholder={T.addDimPh} value={dimNameIn} onChange={(e) => setDimNameIn(e.target.value)} /></div>
          <button type="button" className="btn ghost small" disabled={!dimNameIn.trim()} onClick={() => {
            const id = uid("d"); const n = dimNameIn.trim();
            update((pp) => { pp.sDims.push({ id, name: { en: n, da: n } }); pp.stakeholders.forEach((s) => (s.sc[id] = 3)); const x = pp.analyses.find((y) => y.id === a.id); if (x) x.y = id; });
            setDimNameIn("");
          }}>{T.add}</button>
          {p.analyses.length > 1 && <button type="button" className="btn ghost small danger-text" onClick={() => { if (window.confirm(T.deleteAnalysis + "?")) { update((pp) => { pp.analyses = pp.analyses.filter((x) => x.id !== a.id); }); setUi({ sCur: p.analyses.find((x) => x.id !== a.id)!.id }); } }}>{T.deleteAnalysis}</button>}
        </div>
      </div>
      <div className="grid-2">
        <div className="card"><h3>{a.name}</h3><div className="scroll-x"><table>
          <thead><tr><th>{T.id}</th><th>{T.name}</th><th>{dimName(p, "S", a.y, lang)}</th><th>{dimName(p, "S", a.x, lang)}</th><th>{T.risksCol}</th></tr></thead>
          <tbody>{inScope.map((s) => (
            <tr key={s.id} data-row={s.id} className={rowClass(selId === s.id, ui.flash === s.id)} onClick={() => pick(s.id)}>
              <td><span className="id">{s.id}</span></td><td><b>{s.title || "…"}</b><div className="cat">{tv(lang, s.type)} · {tv(lang, s.cat)}</div></td>
              {[a.y, a.x].map((k) => <td key={k}><ScoreSelect label={k} value={s.sc[k] ?? 1} onChange={(v) => update((pp) => { pp.stakeholders.find((z) => z.id === s.id)!.sc[k] = v; })} /></td>)}
              <td>{risksFor(p, s.id).length}</td>
            </tr>
          ))}</tbody>
        </table></div><p className="muted small">{T.scoresEditable}</p></div>
        <div className="stack">
          <div className="card"><h3>{dimName(p, "S", a.y, lang)} / {dimName(p, "S", a.x, lang)}</h3><StakeholderGrid a={a} selected={selId} onPick={pick} />{a.grid === 2 && <p className="muted small">{T.splitNote}</p>}</div>
          {detail}
        </div>
      </div>
    </>
  );
}
