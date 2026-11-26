import { useRef } from "react";
import type { BudgetLine, Task, WorkPackage } from "../model/types";
import { nextId, pScore, sev } from "../lib/links";
import { uid } from "../data/projects";
import { Register } from "../components/Register";
import { Chip, Chips, ItemEditor, ItemSelect, LinkEditor, ViewHead, rowClass, useApp, type Field } from "../components/ui";
import { downloadBlob, budgetCsv, readBudgetCsv } from "../lib/exporters";
import { useState } from "react";

export function WbsView() {
  const { T } = useApp();
  const fields: Field[] = [
    { k: "code", label: T.code, type: "text" },
    { k: "title", label: T.title, type: "text" },
    { k: "owner", label: T.owner, type: "ref", only: ["people"] },
    { k: "start", label: T.start, type: "date" },
    { k: "end", label: T.end, type: "date" },
    { k: "progress", label: T.progress, type: "num" },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  const depth = (c?: string) => ((c ?? "").match(/\./g) ?? []).length;
  return (
    <>
      <ViewHead id="wbs" />
      <Register<WorkPackage> coll="wbs" fields={fields}
        items={undefined}
        make={(id) => ({ id, code: "", title: "", progress: 0, links: [] })}
        cols={[
          { h: T.code, r: (x) => <span className="num">{x.code}</span> },
          { h: T.title, r: (x) => <span style={{ paddingLeft: depth(x.code) * 16 }}><b>{x.title}</b></span> },
          { h: T.owner, r: (x) => x.owner && <Chip id={x.owner} /> },
          { h: T.progress, r: (x) => <span className="num">{x.progress ?? 0}%</span> },
        ]} />
    </>
  );
}

const DAY = 864e5;
export function ScheduleView() {
  const { p, T, lang, ui, setUi } = useApp();
  const dated = p.wbs.filter((w) => w.start && w.end).sort((a, b) => (a.code ?? "").localeCompare(b.code ?? "", undefined, { numeric: true }));
  const dates = [...dated.flatMap((w) => [w.start!, w.end!]), ...p.milestones.map((m) => m.date)].filter(Boolean).map((d) => +new Date(d));
  const today = +new Date(new Date().toISOString().slice(0, 10));
  const min = dates.length ? Math.min(...dates, today) : today, max = dates.length ? Math.max(...dates, today) : today + 90 * DAY;
  const from = new Date(min); from.setDate(1);
  const to = new Date(max); to.setMonth(to.getMonth() + 1, 1);
  const months: Date[] = [];
  for (const d = new Date(from); d < to; d.setMonth(d.getMonth() + 1)) months.push(new Date(d));
  const span = +to - +from;
  const pct = (d: string | number) => ((+new Date(d) - +from) / span) * 100;
  const risky = (links: string[]) => links.some((id) => { const r = p.risks.find((x) => x.id === id); return r && sev(pScore(r)) === "high"; });
  const loc = lang === "da" ? "da-DK" : "en-GB";
  const pick = (id: string) => setUi({ sel: { ...ui.sel, schedule: id }, flash: undefined });
  const fields: Field[] = [
    { k: "title", label: T.title, type: "text" }, { k: "date", label: T.date, type: "date" }, { k: "done", label: T.done, type: "bool" },
    { k: "notes", label: T.notes, type: "textarea" }, { k: "links", label: T.links, type: "links" },
  ];
  return (
    <>
      <ViewHead id="schedule" />
      <div className="card">
        {dated.length === 0 && !p.milestones.length ? <div className="empty">{T.noDates}</div> : (
          <div className="scroll-x"><div className="gantt" style={{ gridTemplateColumns: `minmax(170px,1.2fr) repeat(${months.length}, minmax(44px,1fr))` }}>
            <div className="gh" />
            {months.map((m) => <div key={+m} className="gh">{m.toLocaleDateString(loc, { month: "short" })}{m.getMonth() === 0 ? " ’" + String(m.getFullYear()).slice(2) : ""}</div>)}
            {dated.map((w) => (
              <div key={w.id} className="contents">
                <div className="gl"><span className="num muted">{w.code}</span> {w.title}</div>
                <div className="gtrack" style={{ gridColumn: `2 / ${months.length + 2}`, backgroundSize: `${100 / months.length}% 100%` }}>
                  <div className="gbar" style={{ left: pct(w.start!) + "%", width: pct(w.end!) - pct(w.start!) + "%" }} />
                  <div className="gbar done" style={{ left: pct(w.start!) + "%", width: ((pct(w.end!) - pct(w.start!)) * (w.progress ?? 0)) / 100 + "%" }} />
                  <div className="gtoday" style={{ left: pct(today) + "%" }} />
                </div>
              </div>
            ))}
            <div className="gl"><b>{T.milestones}</b></div>
            <div className="gtrack ms-track" style={{ gridColumn: `2 / ${months.length + 2}`, backgroundSize: `${100 / months.length}% 100%` }}>
              {p.milestones.map((m) => <button key={m.id} type="button" className={"gms" + (m.done ? " done" : "") + (risky(m.links) ? " risky" : "")} style={{ left: pct(m.date) + "%" }} title={m.title} aria-label={m.title} onClick={() => pick(m.id)} />)}
              <div className="gtoday" style={{ left: pct(today) + "%" }} />
            </div>
          </div></div>
        )}
      </div>
      <h3 className="section-h">{T.threatens}</h3>
      <Register coll="milestones" fields={fields} make={(id) => ({ id, title: "", date: new Date().toISOString().slice(0, 10), done: false, links: [] })}
        cols={[
          { h: T.title, r: (m) => <><b>{m.title}</b>{m.done && <> <span className="badge">{T.done}</span></>}{risky(m.links) && <> <span className="badge sev high">{T.atRisk}</span></>}</> },
          { h: T.date, r: (m) => <span className="num">{m.date}</span> },
        ]} />
    </>
  );
}

export function BoardView() {
  const { p, T, ui, setUi, update } = useApp();
  const sel = p.tasks.find((x) => x.id === ui.sel.board);
  const fields: Field[] = [
    { k: "title", label: T.title, type: "text" },
    { k: "col", label: T.column, type: "select", options: [{ v: "todo", l: T.todo }, { v: "doing", l: T.doing }, { v: "done", l: T.taskDone }] },
    { k: "owner", label: T.owner, type: "ref", only: ["people"] },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  const drag = useRef<string | null>(null);
  const add = (col: string) => { const id = nextId(p, "tasks"); update((pp) => { pp.tasks.push({ id, title: "", col, links: [] } as Task); }); setUi({ sel: { ...ui.sel, board: id } }); };
  return (
    <>
      <ViewHead id="board" />
      <div className="grid-2 wide-left">
        <div className="kanban">
          {(["todo", "doing", "done"] as const).map((c) => (
            <div key={c} className="kcol" onDragOver={(e) => e.preventDefault()} onDrop={() => { const id = drag.current; if (id) update((pp) => { const t = pp.tasks.find((x) => x.id === id); if (t) t.col = c; }); }}>
              <div className="kcol-head"><h4>{T[c === "done" ? "taskDone" : c]} · {p.tasks.filter((x) => x.col === c).length}</h4><button type="button" className="btn ghost small" onClick={() => add(c)}>+</button></div>
              {p.tasks.filter((x) => x.col === c).map((x) => (
                <div key={x.id} draggable onDragStart={() => (drag.current = x.id)} className={"kcard " + rowClass(sel?.id === x.id, ui.flash === x.id)} onClick={() => setUi({ sel: { ...ui.sel, board: x.id }, flash: undefined })}>
                  <div><span className="id">{x.id}</span> <b>{x.title || "…"}</b></div>
                  {x.owner && <div><Chip id={x.owner} /></div>}
                  <Chips ids={x.links} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="card">{sel ? <div className="detail"><div><span className="id">{sel.id}</span><h4>{sel.title || "…"}</h4></div><ItemEditor coll="tasks" item={sel} fields={fields} /></div> : <div className="empty">{T.selectHint}</div>}</div>
      </div>
    </>
  );
}

export function BudgetView() {
  const { p, T, lang, update } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  /** Link the file and, for a CSV, pull its numbers into the budget. */
  const linkFile = (f: File, existing?: string) => {
    const ext = (f.name.split(".").pop() ?? "").toUpperCase().slice(0, 4);
    const id = existing ?? uid("F");
    const today = new Date().toISOString().slice(0, 10);
    const finish = (text?: string) => update((pp) => {
      const rec = pp.files.find((x) => x.id === id);
      if (rec) { rec.name = f.name; rec.synced = today; }
      else pp.files.push({ id, name: f.name, ext, where: lang === "da" ? "Fra din computer" : "From your computer", synced: today, note: `${Math.max(1, Math.round(f.size / 1024))} KB` });
      if (text !== undefined) {
        const n = readBudgetCsv(pp, text, id, lang === "da" ? "hele filen" : "whole file");
        setMsg(n < 0 ? T.readNone : `${T.readDone}: ${n}`);
      }
    });
    if (ext === "CSV" || ext === "TXT") { const r = new FileReader(); r.onload = () => finish(String(r.result)); r.readAsText(f); } else finish();
  };
  const readInto = useRef<string | undefined>(undefined);
  const tot = (k: "plan" | "act" | "fc") => p.budget.reduce((a, b) => a + (b[k] || 0), 0);
  const max = Math.max(1, ...p.budget.map((b) => Math.max(b.plan, b.fc, b.act)));
  const fmt = (n: number) => n.toLocaleString(lang === "da" ? "da-DK" : "en-GB");
  const setLine = (id: string, patch: Partial<BudgetLine>) => update((pp) => { Object.assign(pp.budget.find((b) => b.id === id)!, patch); });
  const diff = tot("fc") - tot("plan");
  return (
    <>
      <ViewHead id="budget" />
      <div className="stats">
        <div className="stat"><div className="v">{fmt(tot("plan"))}</div><div className="l">{T.plan}, k {p.currency}</div></div>
        <div className="stat"><div className="v">{fmt(tot("act"))}</div><div className="l">{T.spent}</div></div>
        <div className="stat"><div className={"v" + (diff > 0 ? " bad" : "")}>{fmt(tot("fc"))}</div><div className="l">{T.forecast}, {diff > 0 ? "+" : ""}{fmt(diff)} {T.vsPlan}</div></div>
      </div>
      <div className="card">
        <div className="card-head">
          <div className="muted small legend-row"><span>▮ {T.spent}</span><span>│ {T.plan}</span><span className="bad">│ {T.forecast}</span></div>
          <div className="row-gap">
            <button type="button" className="btn ghost small" onClick={() => downloadBlob(budgetCsv(p), `${slug(p.name)}-budget.csv`)}>{T.exportBudget}</button>
            <button type="button" className="btn small" onClick={() => update((pp) => { pp.budget.push({ id: uid("BU"), area: "", plan: 0, act: 0, fc: 0, links: [] }); })}>+ {T.add}</button>
          </div>
        </div>
        <div className="scroll-x"><table className="budget">
          <thead><tr><th>{T.area}</th><th>{T.plan}</th><th>{T.spent}</th><th>{T.forecast}</th><th className="bar-col"></th><th>{T.sourceFile}</th><th>{T.range}</th><th>{T.links}</th><th></th></tr></thead>
          <tbody>{p.budget.map((b) => (
            <tr key={b.id}>
              <td><input className="input" aria-label={T.area} value={b.area} onChange={(e) => setLine(b.id, { area: e.target.value })} /></td>
              {(["plan", "act", "fc"] as const).map((k) => <td key={k}><input className="input num-in" type="number" aria-label={k} value={b[k]} onChange={(e) => setLine(b.id, { [k]: +e.target.value })} /></td>)}
              <td className="bar-col"><div className="btrack"><div className="bact" style={{ width: (b.act / max) * 100 + "%" }} /><div className="bplan" style={{ width: (b.plan / max) * 100 + "%" }} />{b.fc !== b.plan && <div className="bfc" style={{ left: (b.fc / max) * 100 + "%" }} />}</div></td>
              <td><select className="sel" aria-label={T.sourceFile} value={b.fileId ?? ""} onChange={(e) => setLine(b.id, { fileId: e.target.value || undefined })}><option value="">–</option>{p.files.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></td>
              <td><input className="input" aria-label={T.range} value={b.range ?? ""} onChange={(e) => setLine(b.id, { range: e.target.value })} /></td>
              <td><LinkEditor ids={b.links} onChange={(ids) => setLine(b.id, { links: ids })} /></td>
              <td><button type="button" className="icon-x" aria-label={T.del} onClick={() => update((pp) => { pp.budget = pp.budget.filter((x) => x.id !== b.id); })}>×</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
      <div className="card">
        <div className="card-head"><h3>{T.linkedFiles}</h3>
          <button type="button" className="btn small" onClick={() => { readInto.current = undefined; fileInput.current?.click(); }}>{T.linkFile}</button>
          <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv,.ods,.txt" hidden onChange={(e) => {
            const f = e.target.files?.[0]; if (f) linkFile(f, readInto.current);
            readInto.current = undefined; e.target.value = "";
          }} />
        </div>
        {p.files.map((f) => (
          <div key={f.id} className="file-row">
            <div className="file-ico">{f.ext}</div>
            <div className="minw0"><b>{f.name}</b><div className="cat">{f.where} · {f.note} · {T.synced} {f.synced}</div>
              <div className="cat">{p.budget.filter((b) => b.fileId === f.id).map((b) => b.area).join(", ")}</div></div>
            <div className="row-gap">
              {f.ext === "CSV" ? <button type="button" className="btn ghost small" title={T.readNumbersHint} onClick={() => { readInto.current = f.id; fileInput.current?.click(); }}>{T.readNumbers}</button>
                : <button type="button" className="btn ghost small" onClick={() => update((pp) => { pp.files.find((x) => x.id === f.id)!.synced = new Date().toISOString().slice(0, 10); })}>{T.refresh}</button>}
              <button type="button" className="icon-x" aria-label={T.del} onClick={() => update((pp) => { pp.files = pp.files.filter((x) => x.id !== f.id); pp.budget.forEach((b) => { if (b.fileId === f.id) delete b.fileId; }); })}>×</button>
            </div>
          </div>
        ))}
        {msg && <p className="small" role="status">{msg}</p>}
        <p className="muted small">{T.filesNote} {T.readNumbersHint}</p>
      </div>
    </>
  );
}
export const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "project";
export { ItemSelect };
