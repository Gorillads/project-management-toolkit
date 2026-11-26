import type { Decision, DecisionOption, Project } from "../model/types";
import { tv } from "../i18n";
import { TRIANGLE } from "../data/catalog";
import { tplById } from "../data/templates";
import { deleteItem, kindOf, nextId, ownerNames, titleOf } from "../lib/links";
import { AddRow, Chip, IdField, LinkEditor, OwnerChips, OwnersEditor, ViewHead, useApp } from "../components/ui";
import { Board } from "../components/Board";

const today = () => new Date().toISOString().slice(0, 10);
const isLate = (d: Decision) => d.status === "Open" && !!d.due && d.due < today();
export const openDecisions = (p: Project) => p.decisions.filter((d) => d.status === "Open");

/** "Raise a decision" for a risk, criterion or deliverable: creates an open
 *  decision linked to the item and opens it in the decision log. Lists the
 *  decisions already linked to the item. */
export function RaiseDecision({ id }: { id: string }) {
  const { p, T, update, go } = useApp();
  const linked = p.decisions.filter((d) => d.links.includes(id));
  const raise = () => {
    const nid = nextId(p, "decisions");
    update((d) => {
      d.decisions.push({ id: nid, title: "", status: "Open", date: "", options: [], owners: [], links: [id] });
      if (!d.enabled.includes("decisions")) d.enabled.push("decisions");
    });
    go("decisions", nid);
  };
  return (
    <div className="raise-dec">
      <span className="muted small">{T.dec.decisions}:</span>
      {linked.map((d) => <Chip key={d.id} id={d.id} full />)}
      <button type="button" className="btn ghost small" onClick={raise}>+ {T.dec.raise}</button>
    </div>
  );
}

const Decider = ({ d }: { d: Decision }) => {
  const { T } = useApp();
  return d.owners.length ? <OwnerChips item={d} /> : <span className="warn-text small">{T.dec.nobody}</span>;
};

/** What a decision affects, read from its links and grouped by kind. */
function Affects({ d }: { d: Decision }) {
  const { p, T } = useApp();
  const D = T.dec;
  const by = (kinds: string[]) => d.links.filter((x) => kinds.includes(kindOf(p, x)));
  const rows: [string, string[]][] = [[D.answersRisks, by(["R"])], [D.changesCriteria, by(["SC", "G"])], [D.changesDeliverables, by(["DL"])], [D.involves, by(["S", "P"])],
    [D.alsoLinked, d.links.filter((x) => !["R", "SC", "G", "DL", "S", "P"].includes(kindOf(p, x)))]];
  const shown = rows.filter(([, ids]) => ids.length);
  if (!shown.length) return <p className="muted small m0">{D.noAffects}</p>;
  return <div className="affects">{shown.map(([l, ids]) => <div key={l} className="kv"><span className="dt">{l}</span><div className="chips">{ids.map((x) => <Chip key={x} id={x} full />)}</div></div>)}</div>;
}

const LEVELS = [0, 1, 2, 3];
function OptionRow({ d, o, n }: { d: Decision; o: DecisionOption; n: number }) {
  const { lang, T, update } = useApp();
  const D = T.dec;
  const set = (fn: (x: DecisionOption, dd: Decision) => void) => update((pp) => { const dd = pp.decisions.find((y) => y.id === d.id); const x = dd?.options.find((y) => y.id === o.id); if (dd && x) fn(x, dd); });
  const chosen = d.chosen === o.id;
  return (
    <div className={"opt" + (chosen ? " chosen" : "")}>
      <div className="opt-head">
        <span className="opt-n">{String.fromCharCode(65 + n)}</span>
        <textarea className="input grow" rows={2} aria-label={D.optionText} placeholder={D.optionPh} value={o.text} onChange={(e) => set((x) => { x.text = e.target.value; })} />
        <button type="button" className={"btn small" + (chosen ? "" : " ghost")} aria-pressed={chosen} onClick={() => update((pp) => {
          const dd = pp.decisions.find((y) => y.id === d.id);
          if (!dd) return;
          if (chosen) { delete dd.chosen; return; }
          dd.chosen = o.id;
          if (dd.status === "Open") { dd.status = "Decided"; if (!dd.date) dd.date = today(); }
        })}>{chosen ? "✓ " + D.chosen : D.choose}</button>
        <button type="button" className="icon-btn" aria-label={T.del} title={T.del} onClick={() => update((pp) => { const dd = pp.decisions.find((y) => y.id === d.id); if (!dd) return; dd.options = dd.options.filter((y) => y.id !== o.id); if (dd.chosen === o.id) delete dd.chosen; })}>✕</button>
      </div>
      <div className="opt-body">
        <label className="small"><span className="good-text">+</span> <input className="input" aria-label={D.pro} placeholder={D.pro} value={o.pro} onChange={(e) => set((x) => { x.pro = e.target.value; })} /></label>
        <label className="small"><span className="bad-text">−</span> <input className="input" aria-label={D.con} placeholder={D.con} value={o.con} onChange={(e) => set((x) => { x.con = e.target.value; })} /></label>
        <div className="opt-tri">
          <span className="muted small">{D.costs}</span>
          {TRIANGLE.map((t) => (
            <label key={t.key} className="small">{t[lang]}
              <select className="sel mini" value={o.tri[t.key as "fin"] ?? 0} onChange={(e) => set((x) => { x.tri[t.key as "fin"] = +e.target.value; })}>
                {LEVELS.map((l) => <option key={l} value={l}>{D.levels[l]}</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function DecisionEditor({ d }: { d: Decision }) {
  const { p, T, update, setUi, ui } = useApp();
  const D = T.dec;
  const set = (fn: (x: Decision) => void) => update((pp) => { const x = pp.decisions.find((y) => y.id === d.id); if (x) fn(x); });
  const chosen = d.options.find((o) => o.id === d.chosen);
  return (
    <div className="detail dec-editor">
      <div className="card-head">
        <div><span className="id">{d.id} · {d.status === "Open" ? D.toDecide : D.decidedOn(d.date)}</span><h4>{d.title || D.questionPh}</h4></div>
        <div className="seg small" role="group" aria-label={T.status}>
          {(["Open", "Decided"] as const).map((s) => <button key={s} type="button" className={d.status === s ? "active" : ""} aria-pressed={d.status === s} onClick={() => set((x) => { x.status = s; if (s === "Decided" && !x.date) x.date = today(); })}>{s === "Open" ? D.toDecide : D.decided}</button>)}
        </div>
      </div>
      <div className="editor">
        <IdField coll="decisions" id={d.id} />
        <div className="field-row"><label htmlFor={`dq-${d.id}`}>{D.question}</label>
          <textarea id={`dq-${d.id}`} className="input" rows={2} placeholder={D.questionPh} value={d.title} onChange={(e) => set((x) => { x.title = e.target.value; })} /></div>
        <div className="two">
          <div className="field-row"><label htmlFor={`dw-${d.id}`}>{d.status === "Open" ? D.whoDecides : D.whoDecided}</label>
            <OwnersEditor id={`dw-${d.id}`} item={d} withStakeholders onChange={(owners, owner) => set((x) => { x.owners = owners; if (owner) x.owner = owner; else delete x.owner; })} /></div>
          {d.status === "Open"
            ? <div className="field-row"><label htmlFor={`dd-${d.id}`}>{D.decideBy}</label><input id={`dd-${d.id}`} className="input" type="date" value={d.due ?? ""} onChange={(e) => set((x) => { if (e.target.value) x.due = e.target.value; else delete x.due; })} /></div>
            : <div className="field-row"><label htmlFor={`dt-${d.id}`}>{D.decidedDate}</label><input id={`dt-${d.id}`} className="input" type="date" value={d.date} onChange={(e) => set((x) => { x.date = e.target.value; })} /></div>}
        </div>
        <div className="sub-h">{D.options} ({d.options.length})</div>
        <p className="muted small m0">{D.optionsHint}</p>
        <div className="opts">{d.options.map((o, i) => <OptionRow key={o.id} d={d} o={o} n={i} />)}</div>
        <button type="button" className="btn ghost small self-start" onClick={() => set((x) => {
          let n = x.options.length + 1;
          while (x.options.some((o) => o.id === "o" + n)) n++;
          x.options.push({ id: "o" + n, text: "", pro: "", con: "", tri: { fin: 0, sched: 0, res: 0 } });
        })}>+ {D.addOption}</button>
        {(d.status === "Decided" || chosen) && (
          <div className="field-row"><label htmlFor={`dy-${d.id}`}>{D.why}</label>
            <textarea id={`dy-${d.id}`} className="input" rows={3} placeholder={D.whyPh} value={d.why ?? ""} onChange={(e) => set((x) => { x.why = e.target.value; })} /></div>
        )}
        <div className="sub-h">{D.affects}</div>
        <Affects d={d} />
        <div className="field-row"><span className="lbl-like">{D.linkMore}</span><LinkEditor ids={d.links} self={d.id} onChange={(ids) => set((x) => { x.links = ids; })} /></div>
        <div className="field-row"><label htmlFor={`dn-${d.id}`}>{T.notes}</label><textarea id={`dn-${d.id}`} className="input" rows={2} value={d.notes ?? ""} onChange={(e) => set((x) => { x.notes = e.target.value; })} /></div>
        <div className="editor-actions">
          <button type="button" className="btn danger small" onClick={() => {
            if (!window.confirm(T.confirmDelete)) return;
            update((pp) => deleteItem(pp, d.id));
            setUi({ sel: { ...ui.sel, decisions: undefined } });
          }}>{T.del}</button>
        </div>
      </div>
      {p.enabled.length > 4 && null}
    </div>
  );
}

export function DecisionsView() {
  const { p, lang, T, ui, setUi, update } = useApp();
  const D = T.dec;
  const selId = ui.sel.decisions;
  const sel = p.decisions.find((x) => x.id === selId);
  const pick = (id: string) => setUi({ sel: { ...ui.sel, decisions: id }, flash: undefined });
  const example = tplById(p.templateId).decisions[0]?.[lang];
  const open = openDecisions(p).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const decided = p.decisions.filter((x) => x.status === "Decided").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const chosenText = (d: Decision) => d.options.find((o) => o.id === d.chosen)?.text;

  return (
    <>
      <ViewHead id="decisions" />
      <Board view="decisions" split="3:2" panels={[
        { id: "add", title: T.layout.p.add, col: "F", node: (
          <div className="card add-card">
            <AddRow coll="decisions" label={D.addQuestion} namePh={example ? D.newPh(example) : D.questionPh} onAdd={(id, title) => {
              update((d) => { d.decisions.push({ id, title, status: "Open", date: "", options: [], owners: [], links: [] }); });
              pick(id);
            }} />
            <p className="muted small m0">{D.raiseHint}</p>
          </div>
        ) },
        { id: "open", title: D.toDecide, col: "L", node: (
          <div className="card">
            <div className="card-head"><h3 className="m0">{D.toDecide} · {open.length}</h3>{open.some(isLate) && <span className="badge sev high">{D.late(open.filter(isLate).length)}</span>}</div>
            {open.length === 0 ? <div className="empty">{D.noneOpen}</div> : (
              <div className="dec-cards">
                {open.map((d) => (
                  <button key={d.id} type="button" className={"dec-card" + (selId === d.id ? " selected" : "") + (isLate(d) ? " late" : "")} onClick={() => pick(d.id)}>
                    <span className="dec-top"><span className="id">{d.id}</span><b className="grow">{d.title || D.questionPh}</b></span>
                    <span className="dec-meta">
                      <span>{D.whoDecides}: <Decider d={d} /></span>
                      <span>{D.decideBy}: {d.due ? <b className={isLate(d) ? "bad-text" : ""}>{d.due}</b> : <span className="warn-text">{D.noDate}</span>}</span>
                      <span>{D.optionsN(d.options.length)}</span>
                    </span>
                    {d.links.length > 0 && <span className="chips">{d.links.slice(0, 4).map((x) => <span key={x} className="pill small-pill">{x} {titleOf(p, x).slice(0, 28)}</span>)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) },
        { id: "decided", title: D.decided, col: "L", node: (
          <div className="card">
            <h3>{D.decided} · {decided.length}</h3>
            {decided.length === 0 ? <div className="empty">{D.noneDecided}</div> : (
              <ol className="dec-timeline">
                {decided.map((d) => (
                  <li key={d.id}>
                    <button type="button" className={"dec-done" + (selId === d.id ? " selected" : "")} onClick={() => pick(d.id)}>
                      <span className="num muted small">{d.date || "–"}</span>
                      <span className="grow minw0"><b>{d.title || D.questionPh}</b>
                        {chosenText(d) && <span className="dec-choice">→ {chosenText(d)}</span>}
                        <span className="muted small">{d.id} · {d.owners.length ? ownerNames(p, d, (v) => tv(lang, v)) : D.nobody}</span></span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) },
        { id: "editor", title: T.layout.p.editor, col: "R", node: <div className="card">{sel ? <DecisionEditor d={sel} /> : <div className="empty">{D.selectHint}</div>}</div> },
      ]} />
    </>
  );
}
