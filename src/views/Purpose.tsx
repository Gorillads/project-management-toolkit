import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Board } from "../components/Board";
import type { Criterion, Deliverable, Goal, Project } from "../model/types";
import { tv, type Dict } from "../i18n";
import { CRITERION_STATUSES, DELIVERABLE_STATUSES } from "../data/catalog";
import { AddRow, ItemEditor, ViewHead, useApp, type Field } from "../components/ui";
import { placeItem, shiftItem, tidy, type Place } from "../lib/structure";
import { opts } from "./Registers";

type Item = { id: string; parent?: string };

/** Items of one level as a forest: top-level items (no parent on this
 *  level) and, under each, its sub-items, in the order of the list (which
 *  the user can change by moving items). */
function forest<T extends Item>(items: T[]) {
  const ids = new Set(items.map((x) => x.id));
  const kids = new Map<string, T[]>();
  const tops: T[] = [];
  for (const x of items) {
    if (x.parent && x.parent !== x.id && ids.has(x.parent)) { if (!kids.has(x.parent)) kids.set(x.parent, []); kids.get(x.parent)!.push(x); }
    else tops.push(x);
  }
  // Items caught in a parent loop have no top; show them at the top level.
  const reach = new Set<string>();
  const walk = (x: T) => { if (reach.has(x.id)) return; reach.add(x.id); (kids.get(x.id) ?? []).forEach(walk); };
  tops.forEach(walk);
  for (const x of items) if (!reach.has(x.id)) { tops.push(x); walk(x); }
  return { tops, kids };
}

/** The purpose: the one top item, stored as the project's only goal. */
export const purposes = (p: Project) => p.goals.slice(0, 1);

/** Everything above and below an item: what it serves (why) and what
 *  delivers it (how), following parents and `serves` links. */
export function chain(p: Project, id: string) {
  const up = new Map<string, string[]>();
  const add = (a: string, b: string) => { if (!up.has(a)) up.set(a, []); up.get(a)!.push(b); };
  for (const g of p.goals) if (g.parent) add(g.id, g.parent);
  for (const c of p.criteria) { c.serves.forEach((s) => add(c.id, s)); if (c.parent) add(c.id, c.parent); }
  for (const d of p.deliverables) { d.serves.forEach((s) => add(d.id, s)); if (d.parent) add(d.id, d.parent); }
  const down = new Map<string, string[]>();
  for (const [a, bs] of up) for (const b of bs) { if (!down.has(b)) down.set(b, []); down.get(b)!.push(a); }
  const walk = (start: string, m: Map<string, string[]>) => {
    const seen = new Set<string>(); const stack = [...(m.get(start) ?? [])];
    while (stack.length) { const x = stack.pop()!; if (seen.has(x)) continue; seen.add(x); stack.push(...(m.get(x) ?? [])); }
    return seen;
  };
  return { up: walk(id, up), down: walk(id, down) };
}

/** Gaps that break the why/how logic, each pointing at the item to fix
 *  ("" when the fix is to add something). */
export function gaps(p: Project, T: Dict): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  const tops = purposes(p);
  if (!tops.length) out.push({ id: "", text: T.pu.gapPurpose });
  if (tops.length && !p.criteria.length) out.push({ id: tops[0].id, text: T.pu.gapGoal });
  const hasReason = (x: { serves: string[]; parent?: string }, list: { id: string; serves: string[]; parent?: string }[], depth = 0): boolean =>
    x.serves.length > 0 || (!!x.parent && depth < 20 && (() => { const par = list.find((y) => y.id === x.parent); return !!par && hasReason(par, list, depth + 1); })());
  const subCrit = (id: string): string[] => p.criteria.filter((c) => c.parent === id).flatMap((c) => [c.id, ...subCrit(c.id)]);
  for (const c of p.criteria) {
    const scope = [c.id, ...subCrit(c.id)];
    if (!p.deliverables.some((d) => d.serves.some((s) => scope.includes(s)))) out.push({ id: c.id, text: T.pu.gapCritDown });
  }
  for (const d of p.deliverables) if (!hasReason(d, p.deliverables)) out.push({ id: d.id, text: T.pu.gapDel });
  return out;
}

function Serves({ id, coll, serves, options, label }: { id: string; coll: "criteria" | "deliverables"; serves: string[]; options: { id: string; title: string; tag?: string }[]; label: string }) {
  const { update } = useApp();
  return (
    <div className="field-row">
      <span className="lbl-like">{label}</span>
      <div className="pills">
        {options.map((o) => {
          const on = serves.includes(o.id);
          return (
            <button key={o.id} type="button" className={"pill" + (on ? " on" : "")} aria-pressed={on}
              onClick={() => update((d) => { const it = d[coll].find((x) => x.id === id); if (it) it.serves = on ? it.serves.filter((s) => s !== o.id) : [...it.serves, o.id]; })}>
              <span className="id">{o.id} </span>{o.tag && <span className="muted">{o.tag}: </span>}{o.title || "…"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PurposeView() {
  const { p, lang, T, ui, setUi, update } = useApp();
  const U = T.pu;
  const sel = ui.sel.purpose;
  const select = (id?: string) => setUi({ sel: { ...ui.sel, purpose: id }, flash: undefined });
  const pick = (id: string) => select(sel === id ? undefined : id);
  const all = useMemo(() => new Map<string, { title: string }>([...p.goals, ...p.criteria, ...p.deliverables].map((x) => [x.id, x])), [p]);
  const title = (id: string) => all.get(id)?.title ?? id;
  const tops = purposes(p);
  const isPurpose = (g: Goal) => tops.includes(g);

  const cF = forest(p.criteria);
  const dF = forest(p.deliverables);
  const purpose = tops[0];

  // Moving items by drag and drop. Dropping on the left or right edge of an
  // item on the same level puts it beside that item; in the middle puts it
  // under it. A criterion dropped on the purpose goes to the top level; a
  // deliverable dropped on a criterion counts towards it.
  const kindOfId = (id: string) => (p.criteria.some((x) => x.id === id) ? "crit" : p.deliverables.some((x) => x.id === id) ? "del" : p.goals.some((x) => x.id === id) ? "goal" : "");
  const [drag, setDrag] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);
  const [hint, setHint] = useState<{ id: string; zone: "before" | "after" | "into" | "link" } | null>(null);
  const zoneFor = (dragged: string, target: string, e: React.DragEvent) => {
    const a = kindOfId(dragged), b = kindOfId(target);
    if (a === b) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      return x < 0.3 ? "before" : x > 0.7 ? "after" : "into";
    }
    if ((a === "crit" && b === "goal") || (a === "del" && b === "crit")) return "link";
    return null;
  };
  const applyDrop = (dragged: string, target: string | null, zone: "before" | "after" | "into" | "link" | "top") => {
    const k = kindOfId(dragged);
    update((d) => {
      const list = (k === "crit" ? d.criteria : d.deliverables) as Item[];
      if (zone === "top" || (zone === "link" && k === "crit")) placeItem(list, dragged, { kind: "top" });
      else if (zone === "link") { const it = d.deliverables.find((x) => x.id === dragged); if (it && target && !it.serves.includes(target)) it.serves.push(target); }
      else if (target) placeItem(list, dragged, { kind: zone, target } as Place);
    });
    select(dragged);
  };
  const dnd = (id: string) => {
    const k = kindOfId(id);
    return {
      draggable: k === "crit" || k === "del",
      onDragStart: (e: React.DragEvent) => { e.stopPropagation(); dragRef.current = id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); setTimeout(() => setDrag(id), 0); },
      onDragEnd: () => { dragRef.current = null; setDrag(null); setHint(null); },
      onDragOver: (e: React.DragEvent) => {
        const from = dragRef.current;
        if (!from || from === id) return;
        const z = zoneFor(from, id, e);
        if (!z) return;
        e.preventDefault(); e.stopPropagation();
        if (hint?.id !== id || hint.zone !== z) setHint({ id, zone: z });
      },
      onDragLeave: () => setHint((h) => (h?.id === id ? null : h)),
      onDrop: (e: React.DragEvent) => {
        const from = dragRef.current;
        if (!from) return;
        const z = zoneFor(from, id, e);
        e.preventDefault(); e.stopPropagation();
        dragRef.current = null; setDrag(null); setHint(null);
        if (z) applyDrop(from, id, z);
      },
    };
  };
  const bandDrop = (kind: "crit" | "del") => ({
    onDragOver: (e: React.DragEvent) => { if (dragRef.current && kindOfId(dragRef.current) === kind) { e.preventDefault(); if (hint?.id !== "band-" + kind) setHint({ id: "band-" + kind, zone: "into" }); } },
    onDrop: (e: React.DragEvent) => { const from = dragRef.current; if (!from || kindOfId(from) !== kind) return; e.preventDefault(); dragRef.current = null; setDrag(null); setHint(null); applyDrop(from, null, "top"); },
  });

  const found = useMemo(() => gaps(p, T), [p, T]);
  const gapIds = new Set(found.map((g) => g.id));
  const lit = useMemo(() => (sel ? chain(p, sel) : null), [p, sel]);
  const isLit = (id: string) => !lit || id === sel || lit.up.has(id) || lit.down.has(id);

  // Connector lines, measured from the rendered boxes: across bands for
  // "serves", and within a band from a sub-item up to its parent.
  const box = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<{ a: string; b: string; d: string; sub: boolean }[]>([]);
  const edges = useMemo(() => {
    const e: [string, string, boolean][] = [];
    for (const c of p.criteria) { c.serves.forEach((s) => e.push([c.id, s, false])); if (c.parent) e.push([c.id, c.parent, true]); }
    for (const d of p.deliverables) { d.serves.forEach((s) => e.push([d.id, s, false])); if (d.parent) e.push([d.id, d.parent, true]); }
    return e;
  }, [p.criteria, p.deliverables]);
  const measure = useCallback(() => {
    const root = box.current;
    if (!root) return;
    const r0 = root.getBoundingClientRect();
    const out: { a: string; b: string; d: string; sub: boolean }[] = [];
    for (const [a, b, sub] of edges) {
      const ea = els.current.get(a), eb = els.current.get(b);
      if (!ea || !eb) continue;
      const ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect();
      const x1 = ra.left + ra.width / 2 - r0.left, y1 = ra.top - r0.top;
      const x2 = rb.left + rb.width / 2 - r0.left, y2 = rb.bottom - r0.top;
      const my = (y1 + y2) / 2;
      out.push({ a, b, sub, d: `M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}` });
    }
    setLines(out);
  }, [edges]);
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (box.current) ro.observe(box.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure, p, lang]);

  const ref = (id: string) => (el: HTMLElement | null) => { if (el) els.current.set(id, el); else els.current.delete(id); };
  const nodeCls = (id: string, shape: string, depth: number) => `pu-node ${shape}` + (depth ? " sub" : "") + (sel === id ? " selected" : "") + (isLit(id) ? "" : " dim") + (gapIds.has(id) ? " gap" : "")
    + (drag === id ? " dragging" : "") + (hint?.id === id ? " drop-" + hint.zone : "");
  const person = (id?: string) => (id ? p.people.find((x) => x.id === id)?.title : "");

  const node = (kind: "goal" | "crit" | "del", it: Goal | Criterion | Deliverable, depth: number) => {
    const purpose = kind === "goal" && isPurpose(it as Goal);
    return (
      <div role="button" tabIndex={0} ref={ref(it.id)} className={nodeCls(it.id, purpose ? "root" : kind, depth)} onClick={() => pick(it.id)} title={it.title}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(it.id); } }} {...dnd(it.id)}>
        <span className={purpose ? "pu-kind" : "id"}>{purpose ? `${U.purpose} · ${it.id}` : it.id}</span>
        <span className="pu-t">{it.title || "…"}</span>
        {kind === "crit" && (it as Criterion).target && <span className="pu-meta">{(it as Criterion).target}</span>}
        {kind === "del" && <span className="pu-meta">{[person((it as Deliverable).owner), (it as Deliverable).due].filter(Boolean).join(" · ")}</span>}
        {kind !== "goal" && <span className={"pu-status s-" + (it as Criterion).status.replace(/\s+/g, "-").toLowerCase()}>{tv(lang, (it as Criterion).status)}</span>}
      </div>
    );
  };
  /** An item with its sub-items laid out directly below it. */
  const tree = <I extends Item>(kind: "goal" | "crit" | "del", f: { kids: Map<string, I[]> }, it: I, depth = 0, seen = new Set<string>()): ReactNode => {
    if (seen.has(it.id)) return null;
    seen.add(it.id);
    const kids = f.kids.get(it.id) ?? [];
    return (
      <div className="pu-tree" key={it.id}>
        {node(kind, it as unknown as Goal, depth)}
        {kids.length > 0 && <div className="pu-kids">{kids.map((k) => tree(kind, f, k, depth + 1, seen))}</div>}
      </div>
    );
  };

  const selGoal = p.goals.find((x) => x.id === sel);
  const selCrit = p.criteria.find((x) => x.id === sel);
  const selDel = p.deliverables.find((x) => x.id === sel);

  // Adding follows the selection: under a selected item on the same level,
  // or for the selected item on the level above.
  const critParent = selCrit?.id;
  const delFor = selCrit?.id;
  const delParent = selDel?.id;
  const critLabel = critParent ? `${U.addSubCriterion} ${U.under} “${title(critParent)}”` : U.addCriterion;
  const delLabel = delParent ? `${U.addSubDeliverable} ${U.under} “${title(delParent)}”` : U.addDeliverable + (delFor ? ` ${U.forSel} “${title(delFor)}”` : "");

  // Nearest level first: criteria, then goals, then the purpose (or the other way down).
  const levelOf = (id: string) => (p.goals.some((x) => x.id === id) ? 2 : p.criteria.some((x) => x.id === id) ? 1 : 0);
  const chainList = (ids: Set<string>, emptyText: string, upward = true) => {
    const list = [...ids].filter((x) => x !== sel).sort((a, b) => (upward ? levelOf(a) - levelOf(b) : levelOf(b) - levelOf(a)) || a.localeCompare(b, undefined, { numeric: true }));
    return list.length ? <div className="chips">{list.map((x) => <button key={x} type="button" className="pill" onClick={() => select(x)}><span className="id">{x} </span>{title(x)}</button>)}</div> : <div className="empty">{emptyText}</div>;
  };
  const chainBox = sel && lit && (
    <div className="pu-chain">
      <div><div className="sub-h m0">↑ {U.whyChain}</div>{chainList(lit.up, U.nothingYet)}</div>
      <div><div className="sub-h m0">↓ {U.howChain}</div>{chainList(lit.down, U.nothingYet, false)}</div>
    </div>
  );
  /** Move the selected item among its siblings or out to the top level. */
  const position = (coll: "criteria" | "deliverables", it: Criterion | Deliverable) => {
    const list = p[coll] as Item[];
    const ids = new Set(list.map((x) => x.id));
    const par = (x: Item) => (x.parent && ids.has(x.parent) ? x.parent : undefined);
    const sib = list.filter((x) => par(x) === par(it));
    const k = sib.findIndex((x) => x.id === it.id);
    return (
      <div className="field-row">
        <span className="lbl-like">{U.position}</span>
        <div className="row-gap">
          <button type="button" className="btn ghost small" disabled={k <= 0} onClick={() => update((d) => { shiftItem(d[coll] as Item[], it.id, -1); })}>← {U.moveLeft}</button>
          <button type="button" className="btn ghost small" disabled={k >= sib.length - 1} onClick={() => update((d) => { shiftItem(d[coll] as Item[], it.id, 1); })}>{U.moveRight} →</button>
          {par(it) && <button type="button" className="btn ghost small" onClick={() => update((d) => { placeItem(d[coll] as Item[], it.id, { kind: "top" }); })}>↑ {U.toTop}</button>}
        </div>
      </div>
    );
  };

  let editor: ReactNode = <div className="empty">{U.guide}</div>;
  if (selGoal) {
    const fields: Field[] = [
      { k: "title", label: U.purpose, type: "textarea" },
      { k: "notes", label: T.notes, type: "textarea" },
      { k: "links", label: T.links, type: "links" },
    ];
    editor = <div className="detail"><div><span className="id">{selGoal.id} · {U.purpose}</span><h4>{selGoal.title || "…"}</h4></div>{chainBox}<ItemEditor coll="goals" item={selGoal} fields={fields} /></div>;
  } else if (selCrit) {
    const fields: Field[] = [
      { k: "title", label: T.title, type: "text" },
      { k: "target", label: U.target, type: "text" },
      { k: "status", label: T.status, type: "select", options: opts(CRITERION_STATUSES, lang) },
      { k: "owner", label: T.owner, type: "ref", only: ["people"] },
      { k: "parent", label: U.parentCriterion, type: "ref", only: ["criteria"] },
      { k: "notes", label: T.notes, type: "textarea" },
      { k: "links", label: T.links, type: "links" },
    ];
    editor = (
      <div className="detail">
        <div><span className="id">{selCrit.id} · {U.criteria}</span><h4>{selCrit.title || "…"}</h4></div>
        {chainBox}
        {position("criteria", selCrit)}
        <ItemEditor coll="criteria" item={selCrit} fields={fields} />
      </div>
    );
  } else if (selDel) {
    const fields: Field[] = [
      { k: "title", label: T.title, type: "text" },
      { k: "owner", label: T.owner, type: "ref", only: ["people"] },
      { k: "due", label: U.due, type: "date" },
      { k: "status", label: T.status, type: "select", options: opts(DELIVERABLE_STATUSES, lang) },
      { k: "parent", label: U.parentDeliverable, type: "ref", only: ["deliverables"] },
      { k: "notes", label: T.notes, type: "textarea" },
      { k: "links", label: T.links, type: "links" },
    ];
    editor = (
      <div className="detail">
        <div><span className="id">{selDel.id} · {U.deliverables}</span><h4>{selDel.title || "…"}</h4></div>
        {chainBox}
        <Serves id={selDel.id} coll="deliverables" serves={selDel.serves} label={U.servesCriteria} options={p.criteria.map((c) => ({ id: c.id, title: c.title }))} />
        {position("deliverables", selDel)}
        <ItemEditor coll="deliverables" item={selDel} fields={fields} />
      </div>
    );
  }

  const empty = !p.goals.length && !p.criteria.length && !p.deliverables.length;
  const example = (
    <div className="pu-example">
      <div className="sub-h m0">{U.exTitle}</div>
      <ol className="pu-ex-steps">
        {U.exRows.map(([lvl, what, ex], i) => (
          <li key={lvl} className={"ex-" + i}><span className={"pu-ex-shape s" + i} aria-hidden="true" /><div><b>{lvl}</b> <span className="muted">· {what}</span><div className="pu-ex-text">“{ex}”</div></div></li>
        ))}
      </ol>
      <p className="muted small m0">{U.exHint}</p>
    </div>
  );
  const band = (label: string, cls: string, children: ReactNode, drop?: ReturnType<typeof bandDrop>, key?: string) => (
    <div className={"pu-band " + cls + (key && hint?.id === "band-" + key ? " drop-into" : "")} {...drop}><div className="pu-label">{label}</div><div className="pu-nodes">{children}</div></div>
  );
  return (
    <>
      <ViewHead id="purpose" />
      <Board view="purpose" split="1:1" panels={[
      { id: "example", title: T.layout.p.example, col: "F", node: empty ? <div className="card">{example}</div> : <details className="pu-ex-details"><summary>{U.exShow}</summary><div className="card">{example}</div></details> },
      { id: "add", title: T.layout.p.add, col: "F", node: <div className="card add-card">
        {!purpose && <AddRow coll="goals" label={U.addPurpose} namePh={U.purposePh} onAdd={(id, t) => { update((d) => { d.goals = [{ id, title: t, links: [] }]; }); select(id); }} />}
        <AddRow coll="criteria" label={critLabel} namePh={U.criterionPh}
          onAdd={(id, t) => { update((d) => { d.criteria.push({ id, title: t, target: "", status: "Draft", serves: [], links: [], ...(critParent ? { parent: critParent } : {}) }); }); select(id); }} />
        <AddRow coll="deliverables" label={delLabel} namePh={U.deliverablePh}
          onAdd={(id, t) => { update((d) => { d.deliverables.push({ id, title: t, status: "Draft", serves: !delParent && delFor ? [delFor] : [], links: [], ...(delParent ? { parent: delParent } : {}) }); }); select(id); }} />
      </div> },
      { id: "diagram", title: T.layout.p.diagram, col: "F", node: <div className="card pu-card">
        <div className="card-head pu-head">
          <p className="muted small m0">{U.dragHint}</p>
          <button type="button" className="btn ghost small" onClick={() => update((d) => tidy(d))} title={U.tidyHint}>{U.tidy}</button>
        </div>
        <div className="pu-wrap">
          <div className="pu-diagram" ref={box}>
            <svg className="pu-lines" aria-hidden="true">
              {lines.map((l) => <path key={l.a + ">" + l.b} d={l.d} className={(l.sub ? "sub " : "") + (lit ? (isLit(l.a) && isLit(l.b) ? "on" : "off") : "")} />)}
            </svg>
            {band(U.purpose, "b-goals", <div className="pu-forest">
              {purpose ? node("goal", purpose, 0) : <span className="muted small">{U.writePurpose}</span>}
            </div>)}
            {band(U.criteria, "b-crit", <div className="pu-forest">
              {cF.tops.map((c) => tree("crit", cF, c))}
              {!p.criteria.length && <span className="muted small">{U.nothingYet}</span>}
            </div>, bandDrop("crit"), "crit")}
            {band(U.deliverables, "b-del", <div className="pu-forest">
              {dF.tops.map((d) => tree("del", dF, d))}
              {!p.deliverables.length && <span className="muted small">{U.nothingYet}</span>}
            </div>, bandDrop("del"), "del")}
          </div>
          <div className="pu-axis" aria-hidden="true">
            <span className="pu-why">{U.why}</span><span className="pu-arrow up" /><span className="pu-arrow down" /><span className="pu-how">{U.how}</span>
          </div>
        </div>
      </div> },
      { id: "editor", title: T.layout.p.editor, col: "L", node: <div className="card">{editor}</div> },
      { id: "check", title: T.layout.p.check, col: "R", node: <div className="card">
          <h3>{U.check} · {found.length}</h3>
          {found.length === 0 ? <p className="ok-note">{U.allGood}</p> : (
            <ul className="gap-list">
              {found.map((g, i) => (
                <li key={g.id + i}><button type="button" className="linked-row" onClick={() => select(g.id || undefined)}>
                  <span className="id">{g.id || U.purpose}</span><span className="grow">{g.id && <b>{title(g.id)} </b>}{g.text}</span>
                </button></li>
              ))}
            </ul>
          )}
        </div> },
      ]} />
    </>
  );
}
