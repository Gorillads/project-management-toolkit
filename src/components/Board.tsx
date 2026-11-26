import { useRef, useState, type ReactNode } from "react";
import { useStore, type Col, type Layout, type Split } from "../state/store";
import { useApp } from "./ui";

/** One movable block on a tab. `col` is where it starts: the left or right
 *  column, or the full width. Panels with `show: false` are skipped (e.g. a
 *  chart that has nothing to draw yet) but keep their place. */
export interface Panel { id: string; title: string; col: Col; node: ReactNode; show?: boolean }

const SPLITS: Split[] = ["2:1", "3:2", "1:1", "1:2"];

/** The saved layout merged with the panels this tab has now: saved panels
 *  keep their place and column; new ones slot in where the default puts them. */
function resolve(saved: Layout | undefined, panels: Panel[], split: Split): Required<Layout> {
  const known = new Set(panels.map((x) => x.id));
  const items = (saved?.items ?? []).filter((x) => known.has(x.id));
  panels.forEach((pnl, i) => {
    if (items.some((x) => x.id === pnl.id)) return;
    const prev = panels.slice(0, i).reverse().find((x) => items.some((y) => y.id === x.id));
    const at = prev ? items.findIndex((y) => y.id === prev.id) + 1 : 0;
    items.splice(at, 0, { id: pnl.id, col: pnl.col });
  });
  return { items, hidden: (saved?.hidden ?? []).filter((x) => known.has(x)), split: saved?.split ?? split };
}

/** A tab's panels in columns. "Arrange" lets the user drag panels, move them
 *  up, down or between columns, make them full width, hide them and change
 *  how wide the two columns are. The layout is remembered per tab. */
export function Board({ view, panels, split = "1:1" }: { view: string; panels: Panel[]; split?: Split }) {
  const { T } = useApp();
  const L = T.layout;
  const saved = useStore((s) => s.ui.layouts?.[view]);
  const setUi = useStore((s) => s.setUi);
  const [arrange, setArrange] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const lay = resolve(saved, panels, split);
  const byId = new Map(panels.map((x) => [x.id, x]));
  const save = (next: Partial<Layout>) => {
    const ui = useStore.getState().ui;
    setUi({ layouts: { ...ui.layouts, [view]: { ...lay, ...next } } });
  };
  const visible = lay.items.filter((x) => !lay.hidden.includes(x.id) && byId.get(x.id)?.show !== false);
  const hiddenPanels = lay.hidden.map((id) => byId.get(id)).filter((x): x is Panel => !!x);

  /** Swap with the nearest visible panel above/below that it can pass. */
  const move = (id: string, dir: -1 | 1) => {
    const me = lay.items.find((x) => x.id === id)!;
    const vi = visible.findIndex((x) => x.id === id);
    let j = vi + dir;
    while (j >= 0 && j < visible.length && !(visible[j].col === me.col || visible[j].col === "F" || me.col === "F")) j += dir;
    if (j < 0 || j >= visible.length) return;
    const items = [...lay.items];
    const a = items.findIndex((x) => x.id === id), b = items.findIndex((x) => x.id === visible[j].id);
    [items[a], items[b]] = [items[b], items[a]];
    save({ items });
  };
  const setCol = (id: string, col: Col) => save({ items: lay.items.map((x) => (x.id === id ? { ...x, col } : x)) });
  const hide = (id: string) => save({ hidden: [...lay.hidden, id] });
  const unhide = (id: string) => save({ hidden: lay.hidden.filter((x) => x !== id) });
  /** Drop `id` before `target` (taking its column), or at the end of a
   *  column in a section when target is "end:<col>:<last id>". */
  const drop = (id: string, target: string) => {
    if (id === target) return;
    const items = lay.items.filter((x) => x.id !== id);
    const me = lay.items.find((x) => x.id === id)!;
    if (target.startsWith("end:")) {
      const [, col, after] = target.split(":");
      const at = after ? items.findIndex((x) => x.id === after) + 1 : items.length;
      items.splice(at, 0, { ...me, col: col as Col });
    } else {
      const t = items.findIndex((x) => x.id === target);
      items.splice(t, 0, { ...me, col: items[t].col });
    }
    save({ items });
  };

  // Consecutive half-width panels form a section with a left and a right
  // column; a full-width panel starts a new section.
  type Section = { full?: string; L: string[]; R: string[]; last: string };
  const sections: Section[] = [];
  for (const it of visible) {
    if (it.col === "F") { sections.push({ full: it.id, L: [], R: [], last: it.id }); continue; }
    let s = sections[sections.length - 1];
    if (!s || s.full) { s = { L: [], R: [], last: it.id }; sections.push(s); }
    s[it.col].push(it.id);
    s.last = it.id;
  }

  const panelEl = (id: string) => {
    const pnl = byId.get(id)!;
    const col = lay.items.find((x) => x.id === id)!.col;
    return (
      <div key={id} data-panel={id} className={"panel" + (arrange ? " arranging" : "") + (drag === id ? " dragging" : "") + (over === id ? " drop-before" : "")}
        onDragOver={arrange ? (e) => { if (!dragRef.current) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== id) setOver(id); } : undefined}
        onDragLeave={arrange ? () => setOver((o) => (o === id ? null : o)) : undefined}
        onDrop={arrange ? (e) => { e.preventDefault(); finish(id); } : undefined}>
        {arrange && (
          <div className="panel-bar" draggable onDragStart={(e) => { dragRef.current = id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); setTimeout(() => setDrag(id), 0); }} onDragEnd={() => { dragRef.current = null; setDrag(null); setOver(null); }}>
            <span className="grip" aria-hidden="true">⠿</span>
            <b className="grow minw0">{pnl.title}</b>
            <button type="button" className="icon-btn" onClick={() => move(id, -1)} aria-label={`${L.up}: ${pnl.title}`} title={L.up}>↑</button>
            <button type="button" className="icon-btn" onClick={() => move(id, 1)} aria-label={`${L.down}: ${pnl.title}`} title={L.down}>↓</button>
            <span className="seg tiny" role="group" aria-label={`${L.place}: ${pnl.title}`}>
              {(["L", "F", "R"] as Col[]).map((c) => (
                <button key={c} type="button" className={col === c ? "active" : ""} aria-pressed={col === c} title={L.cols[c]} onClick={() => setCol(id, c)}>{c === "L" ? "◧" : c === "R" ? "◨" : "▭"}</button>
              ))}
            </span>
            <button type="button" className="icon-btn" onClick={() => hide(id)} aria-label={`${L.hide}: ${pnl.title}`} title={L.hide}>✕</button>
          </div>
        )}
        {pnl.node}
      </div>
    );
  };
  const finish = (target: string) => {
    const id = dragRef.current;
    dragRef.current = null; setDrag(null); setOver(null);
    if (id) drop(id, target);
  };
  const endZone = (col: Col, after: string) => {
    if (!arrange) return null;
    const key = `end:${col}:${after}`;
    return (
      <div className={"drop-end" + (over === key ? " on" : "") + (drag ? " active" : "")}
        onDragOver={(e) => { if (!dragRef.current) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== key) setOver(key); }}
        onDragLeave={() => setOver((o) => (o === key ? null : o))}
        onDrop={(e) => { e.preventDefault(); finish(key); }}>{L.dropHere}</div>
    );
  };
  const ratio = lay.split.split(":").map(Number);

  return (
    <div className={"board" + (arrange ? " arranging" : "")}>
      <div className="board-bar">
        {hiddenPanels.length > 0 && (
          <span className="hidden-list"><span className="muted small">{L.hidden}:</span>
            {hiddenPanels.map((x) => <button key={x.id} type="button" className="pill" onClick={() => unhide(x.id)} title={L.show}>+ {x.title}</button>)}
          </span>
        )}
        {arrange && (
          <label className="small muted split-pick">{L.widths}
            <select className="sel mini" value={lay.split} onChange={(e) => save({ split: e.target.value as Split })}>
              {SPLITS.map((s) => <option key={s} value={s}>{L.splits[s]}</option>)}
            </select>
          </label>
        )}
        {arrange && saved && <button type="button" className="btn ghost small" onClick={() => { const ui = useStore.getState().ui; const rest = { ...ui.layouts }; delete rest[view]; setUi({ layouts: rest }); }}>{L.reset}</button>}
        <button type="button" className={"btn small" + (arrange ? "" : " ghost")} aria-pressed={arrange} onClick={() => setArrange(!arrange)}>{arrange ? L.done : "⠿ " + L.arrange}</button>
      </div>
      {arrange && <p className="muted small m0 arrange-hint">{L.hint}</p>}
      {sections.map((s, i) => s.full ? (
        <div key={s.full} className="board-full">{panelEl(s.full)}{i === sections.length - 1 && endZone("F", s.full)}</div>
      ) : (
        <div key={"sec" + i} className={"board-sec" + (!s.L.length || !s.R.length ? (arrange ? "" : " single") : "")}
          style={{ gridTemplateColumns: (s.L.length && s.R.length) || arrange ? `minmax(0, ${ratio[0]}fr) minmax(0, ${ratio[1]}fr)` : undefined }}>
          {(s.L.length > 0 || arrange) && <div className="stack">{s.L.map(panelEl)}{endZone("L", s.last)}</div>}
          {(s.R.length > 0 || arrange) && <div className="stack">{s.R.map(panelEl)}{endZone("R", s.last)}</div>}
        </div>
      ))}
      {arrange && sections.length === 0 && <div className="empty">{L.allHidden}</div>}
    </div>
  );
}
