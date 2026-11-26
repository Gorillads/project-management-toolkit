import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Criterion, Deliverable, Goal, Project } from "../model/types";
import { tv, type Dict } from "../i18n";
import { CRITERION_STATUSES, DELIVERABLE_STATUSES } from "../data/catalog";
import { AddRow, ItemEditor, ViewHead, useApp, type Field } from "../components/ui";
import { opts } from "./Registers";

type Item = { id: string; parent?: string };

/** Items of one level as a forest: top-level items (no parent on this
 *  level) and, under each, its sub-items. `rank` orders the top level so
 *  lines between the bands cross as little as possible. */
function forest<T extends Item>(items: T[], rank: (x: T) => number) {
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
  return { tops: [...tops].sort((a, b) => rank(a) - rank(b)), kids };
}

/** The purpose: the goal (or goals) with no parent. There should be one. */
export const purposes = (p: Project) => p.goals.filter((g) => !g.parent || !p.goals.some((x) => x.id === g.parent));

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
  tops.slice(1).forEach((g) => out.push({ id: g.id, text: T.pu.gapManyPurposes }));
  const subGoals = (id: string): string[] => p.goals.filter((g) => g.parent === id).flatMap((g) => [g.id, ...subGoals(g.id)]);
  for (const g of p.goals) {
    const scope = [g.id, ...subGoals(g.id)];
    if (!p.criteria.some((c) => c.serves.some((s) => scope.includes(s)))) out.push({ id: g.id, text: T.pu.gapGoal });
  }
  const hasReason = (x: { serves: string[]; parent?: string }, list: { id: string; serves: string[]; parent?: string }[], depth = 0): boolean =>
    x.serves.length > 0 || (!!x.parent && depth < 20 && (() => { const par = list.find((y) => y.id === x.parent); return !!par && hasReason(par, list, depth + 1); })());
  const subCrit = (id: string): string[] => p.criteria.filter((c) => c.parent === id).flatMap((c) => [c.id, ...subCrit(c.id)]);
  for (const c of p.criteria) {
    if (!hasReason(c, p.criteria)) out.push({ id: c.id, text: T.pu.gapCritUp });
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

  // Order each band's top level by what it serves, so lines cross less.
  const order = new Map<string, number>();
  const gF = forest(p.goals, () => 0);
  const number = (f: { tops: Item[]; kids: Map<string, Item[]> }) => { let i = 0; const w = (x: Item) => { order.set(x.id, i++); (f.kids.get(x.id) ?? []).forEach(w); }; f.tops.forEach(w); };
  number(gF);
  const cF = forest(p.criteria, (c) => Math.min(...c.serves.map((s) => order.get(s) ?? 999), 999));
  number(cF);
  const dF = forest(p.deliverables, (d) => Math.min(...d.serves.map((s) => order.get(s) ?? 999), 999));

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
    for (const g of p.goals) if (g.parent) e.push([g.id, g.parent, true]);
    for (const c of p.criteria) { c.serves.forEach((s) => e.push([c.id, s, false])); if (c.parent) e.push([c.id, c.parent, true]); }
    for (const d of p.deliverables) { d.serves.forEach((s) => e.push([d.id, s, false])); if (d.parent) e.push([d.id, d.parent, true]); }
    return e;
  }, [p.goals, p.criteria, p.deliverables]);
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
  const nodeCls = (id: string, shape: string, depth: number) => `pu-node ${shape}` + (depth ? " sub" : "") + (sel === id ? " selected" : "") + (isLit(id) ? "" : " dim") + (gapIds.has(id) ? " gap" : "");
  const person = (id?: string) => (id ? p.people.find((x) => x.id === id)?.title : "");

  const node = (kind: "goal" | "crit" | "del", it: Goal | Criterion | Deliverable, depth: number) => {
    const purpose = kind === "goal" && isPurpose(it as Goal);
    return (
      <button type="button" ref={ref(it.id)} className={nodeCls(it.id, purpose ? "root" : kind, depth)} onClick={() => pick(it.id)} title={it.title}>
        <span className={purpose ? "pu-kind" : "id"}>{purpose ? `${U.purpose} · ${it.id}` : it.id}</span>
        <span className="pu-t">{it.title || "…"}</span>
        {kind === "crit" && (it as Criterion).target && <span className="pu-meta">{(it as Criterion).target}</span>}
        {kind === "del" && <span className="pu-meta">{[person((it as Deliverable).owner), (it as Deliverable).due].filter(Boolean).join(" · ")}</span>}
        {kind !== "goal" && <span className={"pu-status s-" + (it as Criterion).status.replace(/\s+/g, "-").toLowerCase()}>{tv(lang, (it as Criterion).status)}</span>}
      </button>
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
  const goalParent = selGoal?.id ?? tops[0]?.id;
  const critFor = selGoal?.id ?? (selCrit ? undefined : tops[0]?.id);
  const critParent = selCrit?.id;
  const delFor = selCrit?.id;
  const delParent = selDel?.id;
  const goalLabel = !tops.length ? U.addPurpose : `${U.addSubGoal} ${U.under} “${title(goalParent!)}”`;
  const critLabel = critParent ? `${U.addSubCriterion} ${U.under} “${title(critParent)}”` : U.addCriterion + (critFor ? ` ${U.forSel} “${title(critFor)}”` : "");
  const delLabel = delParent ? `${U.addSubDeliverable} ${U.under} “${title(delParent)}”` : U.addDeliverable + (delFor ? ` ${U.forSel} “${title(delFor)}”` : "");

  // Nearest level first: criteria, then goals, then the purpose (or the other way down).
  const levelOf = (id: string) => (p.goals.some((x) => x.id === id) ? (tops.some((t) => t.id === id) ? 3 : 2) : p.criteria.some((x) => x.id === id) ? 1 : 0);
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
  const goalOptions = () => p.goals.map((g) => ({ id: g.id, title: g.title, tag: isPurpose(g) ? U.purpose : undefined }));

  let editor: ReactNode = <div className="empty">{U.guide}</div>;
  if (selGoal) {
    const fields: Field[] = [
      { k: "title", label: isPurpose(selGoal) ? U.purpose : T.title, type: "textarea" },
      { k: "parent", label: U.parentGoal, type: "ref", only: ["goals"] },
      { k: "notes", label: T.notes, type: "textarea" },
      { k: "links", label: T.links, type: "links" },
    ];
    editor = <div className="detail"><div><span className="id">{selGoal.id} · {isPurpose(selGoal) ? U.purpose : U.goals}</span><h4>{selGoal.title || "…"}</h4></div>{chainBox}<ItemEditor coll="goals" item={selGoal} fields={fields} /></div>;
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
        <Serves id={selCrit.id} coll="criteria" serves={selCrit.serves} label={U.servesGoals} options={goalOptions()} />
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
  const band = (label: string, cls: string, children: ReactNode) => (
    <div className={"pu-band " + cls}><div className="pu-label">{label}</div><div className="pu-nodes">{children}</div></div>
  );
  return (
    <>
      <ViewHead id="purpose" />
      {empty ? <div className="card">{example}</div> : <details className="pu-ex-details"><summary>{U.exShow}</summary><div className="card">{example}</div></details>}
      <div className="card add-card">
        <AddRow coll="goals" label={goalLabel} namePh={tops.length ? U.goalPh : U.purposePh} onAdd={(id, t) => { update((d) => { d.goals.push({ id, title: t, links: [], ...(goalParent && tops.length ? { parent: goalParent } : {}) }); }); select(id); }} />
        <AddRow coll="criteria" label={critLabel} namePh={U.criterionPh}
          onAdd={(id, t) => { update((d) => { d.criteria.push({ id, title: t, target: "", status: "Draft", serves: !critParent && critFor ? [critFor] : [], links: [], ...(critParent ? { parent: critParent } : {}) }); }); select(id); }} />
        <AddRow coll="deliverables" label={delLabel} namePh={U.deliverablePh}
          onAdd={(id, t) => { update((d) => { d.deliverables.push({ id, title: t, status: "Draft", serves: !delParent && delFor ? [delFor] : [], links: [], ...(delParent ? { parent: delParent } : {}) }); }); select(id); }} />
      </div>
      <div className="card pu-card">
        <div className="pu-wrap">
          <div className="pu-diagram" ref={box}>
            <svg className="pu-lines" aria-hidden="true">
              {lines.map((l) => <path key={l.a + ">" + l.b} d={l.d} className={(l.sub ? "sub " : "") + (lit ? (isLit(l.a) && isLit(l.b) ? "on" : "off") : "")} />)}
            </svg>
            {band(U.purpose + " · " + U.goals, "b-goals", <div className="pu-forest">
              {gF.tops.map((g) => tree("goal", gF, g))}
              {!p.goals.length && <span className="muted small">{U.writePurpose}</span>}
            </div>)}
            {band(U.criteria, "b-crit", <div className="pu-forest">
              {cF.tops.map((c) => tree("crit", cF, c))}
              {!p.criteria.length && <span className="muted small">{U.nothingYet}</span>}
            </div>)}
            {band(U.deliverables, "b-del", <div className="pu-forest">
              {dF.tops.map((d) => tree("del", dF, d))}
              {!p.deliverables.length && <span className="muted small">{U.nothingYet}</span>}
            </div>)}
          </div>
          <div className="pu-axis" aria-hidden="true">
            <span className="pu-why">{U.why}</span><span className="pu-arrow up" /><span className="pu-arrow down" /><span className="pu-how">{U.how}</span>
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">{editor}</div>
        <div className="card">
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
        </div>
      </div>
    </>
  );
}
