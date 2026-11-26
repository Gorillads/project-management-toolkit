import { useState } from "react";
import type { Analysis, Stakeholder } from "../model/types";
import { tv } from "../i18n";
import { peopleFor, pScore, risksFor, sev } from "../lib/links";
import { uid } from "../data/projects";
import { Backlinks, Chip, ScoreSelect, Sev, ViewHead, rowClass, useApp, useGoto } from "../components/ui";
import { Board } from "../components/Board";
import { StakeholderGrid, dimName } from "../components/Charts";

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

/** One stakeholder as seen by the analysis: the scores are edited here,
 *  everything else about the actor is edited on the Actors tab. */
function Detail({ s, hl }: { s: Stakeholder; hl: string[] }) {
  const { p, lang, T, go } = useApp();
  const goto = useGoto();
  const rs = risksFor(p, s.id).sort((a, b) => pScore(b) - pScore(a));
  return (
    <div className="detail">
      <div className="card-head">
        <div><span className="id">{s.id} · {tv(lang, s.type)}{s.cat && tv(lang, s.cat) !== tv(lang, s.type) ? " · " + tv(lang, s.cat) : ""}</span><h4>{s.title || "…"}</h4></div>
        <button type="button" className="btn ghost small" onClick={() => go("actors", s.id)}>{T.sa.editInActors} →</button>
      </div>
      {s.need && <p className="muted small m0">{s.need}</p>}
      <div className="sub-h">{T.sa.scores}</div>
      <ScoreProfile kind="S" id={s.id} sc={s.sc} hl={hl} />
      <div className="kv"><span className="dt">{T.contacts}</span><div className="chips">{peopleFor(p, s.id).map((x) => <Chip key={x.id} id={x.id} />)}{!peopleFor(p, s.id).length && <span className="muted">{T.none}</span>}</div></div>
      <div className="sub-h">{T.linkedRisks} ({rs.length})</div>
      <div className="linked-list">
        {rs.map((r) => <button key={r.id} type="button" className="linked-row" onClick={() => goto(r.id)}><span className="id">{r.id}</span><span className="grow">{r.title}</span><Sev s={pScore(r)} /></button>)}
        {!rs.length && <div className="empty">{T.none}</div>}
      </div>
      {p.enabled.length > 4 && <><div className="sub-h">{T.alsoIn}</div><Backlinks id={s.id} skip={["R", "S", "P"]} /></>}
    </div>
  );
}

export function StakeholdersView() {
  const { p, lang, T, ui, setUi, update, go } = useApp();
  const A = T.sa;
  const [newName, setNewName] = useState("");
  const [dimNameIn, setDimNameIn] = useState("");
  const selId = ui.sel.stakeholders;
  const sel = p.stakeholders.find((x) => x.id === selId);
  const pick = (id: string) => setUi({ sel: { ...ui.sel, stakeholders: id }, flash: undefined });
  const a = p.analyses.find((x) => x.id === ui.sCur) ?? p.analyses[0];
  const setA = (fn: (a: Analysis) => void) => update((pp) => { const x = pp.analyses.find((y) => y.id === a.id); if (x) fn(x); });
  const mode = ui.sMode;
  const pin = (id: string) => update((pp) => { const y = pp.analyses.find((z) => z.id === id); if (y) y.pinned = !y.pinned; });

  // The actors themselves come from the Actors tab; this tool only analyses them.
  const head = (
    <>
      <ViewHead id="stakeholders" />
      <div className="toolbar">
        <div className="seg">{(["analysis", "compare", "list"] as const).map((m) => <button key={m} type="button" className={mode === m ? "active" : ""} aria-pressed={mode === m} onClick={() => setUi({ sMode: m })}>{T[m === "list" ? "simpleList" : m]}</button>)}</div>
        <span className="muted small sa-source">{A.source(p.stakeholders.length)} <button type="button" className="link-btn" onClick={() => go("actors")}>{A.manageActors} →</button></span>
      </div>
    </>
  );
  const detail = <div className="card">{sel ? <Detail s={sel} hl={mode === "analysis" && a ? [a.x, a.y] : []} /> : <div className="empty">{T.sa.selectHint}</div>}</div>;

  if (!p.stakeholders.length) {
    return <>{head}<div className="card empty-state"><p>{A.noActors}</p><button type="button" className="btn small" onClick={() => go("actors")}>{A.manageActors} →</button></div></>;
  }

  if (mode === "list") {
    return (
      <>
        {head}
        <Board view="stakeholders-list" split="3:2" panels={[
          { id: "list", title: T.simpleList, col: "L", node: <div className="card"><div className="scroll-x"><table>
            <thead><tr><th>{T.id}</th><th>{T.name}</th><th>{T.group}</th><th>{T.org}</th><th>{T.contacts}</th><th>{T.risksCol}</th></tr></thead>
            <tbody>
              {(["Internal", "External"] as const).map((ty) => [
                <tr key={ty} className="group-row"><td colSpan={6}>{T[ty === "Internal" ? "internal" : "external"]} · {p.stakeholders.filter((s) => s.type === ty).length}</td></tr>,
                ...p.stakeholders.filter((s) => s.type === ty).map((s) => {
                  const rs = risksFor(p, s.id);
                  return (
                    <tr key={s.id} data-row={s.id} className={rowClass(selId === s.id, ui.flash === s.id)} onClick={() => pick(s.id)}>
                      <td><span className="id">{s.id}</span></td><td><b>{s.title || "…"}</b></td>
                      <td>{s.cat && <span className={"badge " + (ty === "Internal" ? "type-int" : "")}>{tv(lang, s.cat)}</span>}</td>
                      <td className="muted">{s.org}</td>
                      <td><div className="chips">{peopleFor(p, s.id).map((x) => <Chip key={x.id} id={x.id} />)}</div></td>
                      <td>{rs.length ? <span className={"badge sev " + (rs.some((r) => sev(pScore(r)) === "high") ? "high" : "med")}>{rs.length}</span> : <span className="muted small">0</span>}</td>
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table></div></div> },
          { id: "details", title: T.layout.p.details, col: "R", node: detail },
        ]} />
      </>
    );
  }
  if (mode === "compare") {
    return (
      <>
        {head}
        <Board view="stakeholders-compare" split="3:2" panels={[
          { id: "grids", title: A.allAnalyses, col: "F", node: <div className="compare">
            {p.analyses.map((x) => (
              <div className="card" key={x.id}>
                <div className="card-head"><div><h3>{x.name}</h3><span className="muted small">{A.inScope(x.ids.filter((i) => p.stakeholders.some((s) => s.id === i)).length)}</span></div>
                  <button type="button" className="pin" aria-pressed={!!x.pinned} title={A.pinHint} onClick={() => pin(x.id)}>★</button></div>
                <StakeholderGrid a={x} selected={selId} onPick={pick} />
              </div>
            ))}
          </div> },
          { id: "details", title: T.layout.p.details, col: "L", node: detail },
        ]} />
      </>
    );
  }
  if (!a) return null;
  const inScope = p.stakeholders.filter((s) => a.ids.includes(s.id));
  const dimOpts = p.sDims.map((d) => <option key={d.id} value={d.id}>{d.name[lang]}</option>);
  const groups = [...p.sCats.filter((c) => p.stakeholders.some((s) => s.cat === c)), ...(p.stakeholders.some((s) => !s.cat || !p.sCats.includes(s.cat)) ? [""] : [])];
  const membersOf = (c: string) => p.stakeholders.filter((s) => (c ? s.cat === c : !s.cat || !p.sCats.includes(s.cat)));
  const catOn = (c: string) => { const ids = membersOf(c).map((s) => s.id); return ids.length > 0 && ids.every((i) => a.ids.includes(i)); };
  const yN = dimName(p, "S", a.y, lang), xN = dimName(p, "S", a.x, lang);

  const picker = (
    <div className="card sa-pick">
      <div className="analysis-tabs sa-tabs" role="tablist" aria-label={A.analyses}>
        {p.analyses.map((x) => (
          <div key={x.id} className={"atab" + (x.id === a.id ? " active" : "")}>
            <button type="button" role="tab" aria-selected={x.id === a.id} className="analysis-tab" onClick={() => setUi({ sCur: x.id })}>{x.name}<small>{A.inScope(x.ids.length)}</small></button>
            <button type="button" className="pin" aria-pressed={!!x.pinned} title={A.pinHint} onClick={() => pin(x.id)}>★</button>
          </div>
        ))}
      </div>
      <form className="sa-new" onSubmit={(e) => {
        e.preventDefault();
        const id = uid("sa");
        const name = newName.trim() || A.untitled;
        update((pp) => { pp.analyses.push({ id, name, scope: "", ids: pp.stakeholders.map((s) => s.id), x: "interest", y: "power", grid: 2, pinned: false }); });
        setUi({ sCur: id }); setNewName("");
      }}>
        <input className="input" aria-label={A.newName} placeholder={A.newName} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className="btn small">+ {A.newAnalysis}</button>
      </form>
    </div>
  );

  const setup = (
    <div className="card sa-setup">
      <div className="card-head">
        <h3 className="m0">{A.setup}</h3>
        <div className="row-gap">
          <button type="button" className="btn ghost small" onClick={() => {
            const id = uid("sa");
            update((pp) => { pp.analyses.push({ ...structuredClone(a), id, name: `${a.name} (${A.copy})`, pinned: false, quads: undefined }); });
            setUi({ sCur: id });
          }}>{A.duplicate}</button>
          {p.analyses.length > 1 && <button type="button" className="btn ghost small danger-text" onClick={() => { if (window.confirm(T.deleteAnalysis + "?")) { update((pp) => { pp.analyses = pp.analyses.filter((x) => x.id !== a.id); }); setUi({ sCur: p.analyses.find((x) => x.id !== a.id)!.id }); } }}>{T.deleteAnalysis}</button>}
        </div>
      </div>
      <div className="sa-steps">
        <div className="sa-step">
          <div className="sa-n">1</div>
          <div className="grow minw0">
            <label className="lbl" htmlFor="sa-rename">{A.name}</label>
            <input id="sa-rename" className="input" value={a.name} onChange={(e) => setA((x) => { x.name = e.target.value; })} />
          </div>
        </div>
        <div className="sa-step">
          <div className="sa-n">2</div>
          <div className="grow minw0">
            <span className="lbl">{A.who} ({inScope.length}/{p.stakeholders.length})</span>
            <div className="pills">
              <button type="button" className={"pill" + (inScope.length === p.stakeholders.length ? " on" : "")} onClick={() => setA((x) => { x.ids = inScope.length === p.stakeholders.length ? [] : p.stakeholders.map((s) => s.id); })}>{T.all}</button>
              {groups.map((c) => (
                <button key={c || "none"} type="button" className={"pill" + (catOn(c) ? " on" : "")} aria-pressed={catOn(c)} onClick={() => setA((x) => {
                  const ids = membersOf(c).map((s) => s.id);
                  x.ids = catOn(c) ? x.ids.filter((i) => !ids.includes(i)) : [...new Set([...x.ids, ...ids])];
                })}>{c ? tv(lang, c) : T.noGroup} <span className="muted">{membersOf(c).length}</span></button>
              ))}
            </div>
            <details className="picker"><summary>{T.pickIndividual}</summary>
              <div className="pick-list">{groups.map((c) => [
                <div key={"g" + c} className="pick-group">{c ? tv(lang, c) : T.noGroup}</div>,
                ...membersOf(c).map((s) => (
                  <label key={s.id}><input type="checkbox" checked={a.ids.includes(s.id)} onChange={(e) => setA((x) => { x.ids = e.target.checked ? [...x.ids, s.id] : x.ids.filter((i) => i !== s.id); })} />{s.title || s.id}</label>
                )),
              ])}</div>
            </details>
          </div>
        </div>
        <div className="sa-step">
          <div className="sa-n">3</div>
          <div className="grow minw0">
            <span className="lbl">{A.axes}</span>
            <div className="ctrl-row">
              <div className="ctrl"><label htmlFor="sy">{T.yAxis}</label><select id="sy" className="sel" value={a.y} onChange={(e) => setA((x) => { x.y = e.target.value; })}>{dimOpts}</select></div>
              <button type="button" className="swap" title={T.swap} aria-label={T.swap} onClick={() => setA((x) => { [x.x, x.y] = [x.y, x.x]; })}>⇄</button>
              <div className="ctrl"><label htmlFor="sx">{T.xAxis}</label><select id="sx" className="sel" value={a.x} onChange={(e) => setA((x) => { x.x = e.target.value; })}>{dimOpts}</select></div>
              <div className="ctrl"><span className="lbl">{T.grid}</span><div className="seg small">{([2, 5] as const).map((g) => <button key={g} type="button" className={a.grid === g ? "active" : ""} onClick={() => setA((x) => { x.grid = g; })}>{g}×{g}</button>)}</div></div>
            </div>
            <details className="picker"><summary>{A.ownDim}</summary>
              <form className="row-gap" onSubmit={(e) => {
                e.preventDefault();
                const n = dimNameIn.trim();
                if (!n) return;
                const id = uid("d");
                update((pp) => { pp.sDims.push({ id, name: { en: n, da: n } }); pp.stakeholders.forEach((s) => (s.sc[id] = 3)); const x = pp.analyses.find((y) => y.id === a.id); if (x) x.y = id; });
                setDimNameIn("");
              }}>
                <input className="input grow" aria-label={T.addDim} placeholder={T.addDimPh} value={dimNameIn} onChange={(e) => setDimNameIn(e.target.value)} />
                <button type="submit" className="btn ghost small" disabled={!dimNameIn.trim()}>{T.add}</button>
              </form>
              <p className="muted small m0">{A.ownDimHint}</p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {head}
      <Board view="stakeholders" split="3:2" panels={[
        { id: "pick", title: A.analyses, col: "F", node: picker },
        { id: "setup", title: A.setup, col: "F", node: setup },
        { id: "grid", title: A.result, col: "L", node: <div className="card"><div className="card-head"><h3 className="m0">{a.name}</h3><span className="muted small">{yN} × {xN}</span></div>
          {inScope.length ? <StakeholderGrid a={a} selected={selId} onPick={pick} /> : <div className="empty">{A.nobody}</div>}
          {a.grid === 2 && inScope.length > 0 && <p className="muted small">{T.splitNote}</p>}</div> },
        { id: "scores", title: A.scoresTable, col: "L", node: <div className="card"><h3>{A.scoresTable}</h3><div className="scroll-x"><table>
          <thead><tr><th>{T.id}</th><th>{T.name}</th><th>{yN}</th><th>{xN}</th><th>{T.risksCol}</th></tr></thead>
          <tbody>{inScope.map((s) => (
            <tr key={s.id} data-row={s.id} className={rowClass(selId === s.id, ui.flash === s.id)} onClick={() => pick(s.id)}>
              <td><span className="id">{s.id}</span></td><td><b>{s.title || "…"}</b><div className="cat">{tv(lang, s.type)}{s.cat && tv(lang, s.cat) !== tv(lang, s.type) ? " · " + tv(lang, s.cat) : ""}</div></td>
              {[a.y, a.x].map((k) => <td key={k}><ScoreSelect label={dimName(p, "S", k, lang)} value={s.sc[k] ?? 1} onChange={(v) => update((pp) => { pp.stakeholders.find((z) => z.id === s.id)!.sc[k] = v; })} /></td>)}
              <td>{risksFor(p, s.id).length}</td>
            </tr>
          ))}</tbody>
        </table></div><p className="muted small">{T.scoresEditable}</p></div> },
        { id: "details", title: T.layout.p.details, col: "R", node: detail },
      ]} />
    </>
  );
}
