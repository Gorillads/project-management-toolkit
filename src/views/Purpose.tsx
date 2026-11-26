import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Project } from "../model/types";
import { tv, type Dict } from "../i18n";
import { CRITERION_STATUSES, DELIVERABLE_STATUSES, ROOT } from "../data/catalog";
import { AddRow, ItemEditor, ViewHead, useApp, type Field } from "../components/ui";
import { opts } from "./Registers";


/** Items of one level in reading order: each top-level item followed by
 *  its sub-items. `rank` orders top-level items by what they serve, so the
 *  lines between bands cross as little as possible. */
function ordered<T extends { id: string; parent?: string }>(items: T[], rank: (x: T) => number): { item: T; depth: number }[] {
  const ids = new Set(items.map((x) => x.id));
  const kids = new Map<string, T[]>();
  const tops: T[] = [];
  for (const x of items) {
    if (x.parent && ids.has(x.parent) && x.parent !== x.id) { if (!kids.has(x.parent)) kids.set(x.parent, []); kids.get(x.parent)!.push(x); }
    else tops.push(x);
  }
  const out: { item: T; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (x: T, depth: number) => {
    if (seen.has(x.id)) return;
    seen.add(x.id);
    out.push({ item: x, depth });
    for (const k of kids.get(x.id) ?? []) walk(k, depth + 1);
  };
  [...tops].sort((a, b) => rank(a) - rank(b)).forEach((x) => walk(x, 0));
  for (const x of items) if (!seen.has(x.id)) walk(x, 0); // items caught in a parent loop
  return out;
}

/** Everything above and below an item: what it serves (why) and what
 *  delivers it (how), following parents and `serves` links. */
export function chain(p: Project, id: string) {
  const up = new Map<string, string[]>(); // child -> things it serves / belongs to
  const add = (a: string, b: string) => { if (!up.has(a)) up.set(a, []); up.get(a)!.push(b); };
  for (const g of p.goals) add(g.id, g.parent && p.goals.some((x) => x.id === g.parent) ? g.parent : ROOT);
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

/** Gaps that break the why/how logic, each pointing at the item to fix. */
export function gaps(p: Project, T: Dict): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  if (!p.charter.purpose.trim()) out.push({ id: ROOT, text: T.pu.gapPurpose });
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

function Serves({ id, coll, serves, options, label }: { id: string; coll: "criteria" | "deliverables"; serves: string[]; options: { id: string; title: string }[]; label: string }) {
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
              {o.id !== ROOT && <span className="id">{o.id} </span>}{o.title}
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
  const pick = (id: string) => setUi({ sel: { ...ui.sel, purpose: sel === id ? undefined : id }, flash: undefined });
  const title = (id: string) => (id === ROOT ? U.purpose : p.goals.find((x) => x.id === id)?.title ?? p.criteria.find((x) => x.id === id)?.title ?? p.deliverables.find((x) => x.id === id)?.title ?? id);

  const goals = useMemo(() => ordered(p.goals, () => 0), [p.goals]);
  const goalIndex = new Map(goals.map((g, i) => [g.item.id, i]));
  const crits = ordered(p.criteria, (c) => Math.min(...c.serves.map((s) => goalIndex.get(s) ?? -1), 999));
  const critIndex = new Map(crits.map((c, i) => [c.item.id, i]));
  const dels = ordered(p.deliverables, (d) => Math.min(...d.serves.map((s) => critIndex.get(s) ?? 999), 999));
  const found = useMemo(() => gaps(p, T), [p, T]);
  const gapIds = new Set(found.map((g) => g.id));
  const lit = useMemo(() => (sel ? chain(p, sel) : null), [p, sel]);
  const isLit = (id: string) => !lit || id === sel || lit.up.has(id) || lit.down.has(id);

  // Connector lines, measured from the rendered boxes.
  const box = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<{ a: string; b: string; d: string }[]>([]);
  const edges = useMemo(() => {
    const e: [string, string][] = [];
    for (const g of p.goals) if (!g.parent || !p.goals.some((x) => x.id === g.parent)) e.push([g.id, ROOT]);
    for (const c of p.criteria) c.serves.forEach((s) => e.push([c.id, s]));
    for (const d of p.deliverables) d.serves.forEach((s) => e.push([d.id, s]));
    return e;
  }, [p.goals, p.criteria, p.deliverables]);
  const measure = useCallback(() => {
    const root = box.current;
    if (!root) return;
    const r0 = root.getBoundingClientRect();
    const out: { a: string; b: string; d: string }[] = [];
    for (const [a, b] of edges) {
      const ea = els.current.get(a), eb = els.current.get(b);
      if (!ea || !eb) continue;
      const ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect();
      const x1 = ra.left + ra.width / 2 - r0.left, y1 = ra.top - r0.top;
      const x2 = rb.left + rb.width / 2 - r0.left, y2 = rb.bottom - r0.top;
      const my = (y1 + y2) / 2;
      out.push({ a, b, d: `M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}` });
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
  const nodeCls = (id: string, shape: string, depth = 0) => `pu-node ${shape}` + (depth ? " sub" : "") + (sel === id ? " selected" : "") + (isLit(id) ? "" : " dim") + (gapIds.has(id) ? " gap" : "");
  const person = (id?: string) => (id ? p.people.find((x) => x.id === id)?.title : "");

  const selGoal = p.goals.find((x) => x.id === sel);
  const selCrit = p.criteria.find((x) => x.id === sel);
  const selDel = p.deliverables.find((x) => x.id === sel);

  // New items attach to what is selected: a criterion to the selected goal,
  // a deliverable to the selected criterion.
  const critTarget = sel === ROOT || selGoal ? sel! : undefined;
  const delTarget = selCrit ? selCrit.id : undefined;
  const select = (id: string) => setUi({ sel: { ...ui.sel, purpose: id }, flash: undefined });

  let editor: ReactNode = <div className="empty">{U.guide}</div>;
  // Nearest level first: criteria, then goals, then the purpose (or the other way down).
  const levelOf = (id: string) => (id === ROOT ? 3 : p.goals.some((x) => x.id === id) ? 2 : p.criteria.some((x) => x.id === id) ? 1 : 0);
  const chainList = (ids: Set<string>, empty: string, upward = true) => {
    const list = [...ids].filter((x) => x !== sel).sort((a, b) => (upward ? levelOf(a) - levelOf(b) : levelOf(b) - levelOf(a)) || a.localeCompare(b, undefined, { numeric: true }));
    return list.length ? <div className="chips">{list.map((x) => <button key={x} type="button" className="pill" onClick={() => select(x)}>{x !== ROOT && <span className="id">{x} </span>}{title(x)}</button>)}</div> : <div className="empty">{empty}</div>;
  };
  const chainBox = sel && lit && (
    <div className="pu-chain">
      <div><div className="sub-h m0">↑ {U.whyChain}</div>{chainList(lit.up, U.nothingYet)}</div>
      <div><div className="sub-h m0">↓ {U.howChain}</div>{chainList(lit.down, U.nothingYet, false)}</div>
    </div>
  );
  if (sel === ROOT) {
    editor = (
      <div className="detail">
        <div><span className="id">{U.purpose}</span><h4>{p.name}</h4></div>
        <div className="field-row"><label htmlFor="pu-root">{U.purpose}</label>
          <textarea id="pu-root" className="input" rows={3} placeholder={U.writePurpose} value={p.charter.purpose} onChange={(e) => update((d) => { d.charter.purpose = e.target.value; })} /></div>
        {chainBox}
      </div>
    );
  } else if (selGoal) {
    const fields: Field[] = [
      { k: "title", label: T.title, type: "text" },
      { k: "parent", label: U.parentGoal, type: "ref", only: ["goals"] },
      { k: "notes", label: T.notes, type: "textarea" },
      { k: "links", label: T.links, type: "links" },
    ];
    editor = <div className="detail"><div><span className="id">{selGoal.id} · {U.goals}</span><h4>{selGoal.title || "…"}</h4></div>{chainBox}<ItemEditor coll="goals" item={selGoal} fields={fields} /></div>;
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
        <Serves id={selCrit.id} coll="criteria" serves={selCrit.serves} label={U.servesGoals} options={[{ id: ROOT, title: U.purpose }, ...p.goals.map((g) => ({ id: g.id, title: g.title }))]} />
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
        <AddRow coll="goals" label={U.addGoal} namePh={U.goalPh} onAdd={(id, t) => { update((d) => { d.goals.push({ id, title: t, links: [], ...(selGoal ? { parent: selGoal.id } : {}) }); }); select(id); }} />
        <AddRow coll="criteria" label={U.addCriterion + (critTarget ? ` ${U.forSel} “${title(critTarget)}”` : "")} namePh={U.criterionPh}
          onAdd={(id, t) => { update((d) => { d.criteria.push({ id, title: t, target: "", status: "Not measured", serves: critTarget ? [critTarget] : d.goals.length ? [] : [ROOT], links: [] }); }); select(id); }} />
        <AddRow coll="deliverables" label={U.addDeliverable + (delTarget ? ` ${U.forSel} “${title(delTarget)}”` : "")} namePh={U.deliverablePh}
          onAdd={(id, t) => { update((d) => { d.deliverables.push({ id, title: t, status: "Not started", serves: delTarget ? [delTarget] : [], links: [] }); }); select(id); }} />
      </div>
      <div className="card pu-card">
        <div className="pu-wrap">
          <div className="pu-diagram" ref={box}>
            <svg className="pu-lines" aria-hidden="true">
              {lines.map((l) => <path key={l.a + ">" + l.b} d={l.d} className={isLit(l.a) && isLit(l.b) && !!lit ? "on" : lit ? "off" : ""} />)}
            </svg>
            {band(U.purpose + " · " + U.goals, "b-goals", <>
              <div className="pu-row">
                <button type="button" ref={ref(ROOT)} className={nodeCls(ROOT, "root") + (p.charter.purpose.trim() ? "" : " gap")} onClick={() => pick(ROOT)}>
                  <span className="pu-kind">{U.purpose}</span><span className="pu-t">{p.charter.purpose.trim() || U.writePurpose}</span>
                </button>
              </div>
              <div className="pu-row">
                {goals.map(({ item, depth }) => (
                  <button key={item.id} type="button" ref={ref(item.id)} className={nodeCls(item.id, "goal", depth)} onClick={() => pick(item.id)} title={item.title}>
                    <span className="id">{depth ? "↳ " : ""}{item.id}</span><span className="pu-t">{item.title || "…"}</span>
                    {depth > 0 && item.parent && <span className="pu-meta">{U.under} {item.parent}</span>}
                  </button>
                ))}
              </div>
            </>)}
            {band(U.criteria, "b-crit", <div className="pu-row">
              {crits.map(({ item, depth }) => (
                <button key={item.id} type="button" ref={ref(item.id)} className={nodeCls(item.id, "crit", depth)} onClick={() => pick(item.id)} title={item.title}>
                  <span className="id">{depth ? "↳ " : ""}{item.id}</span><span className="pu-t">{item.title || "…"}</span>
                  {item.target && <span className="pu-meta">{item.target}</span>}
                  {depth > 0 && item.parent && <span className="pu-meta">{U.under} {item.parent}</span>}
                  <span className={"pu-status s-" + item.status.replace(/\s+/g, "-").toLowerCase()}>{tv(lang, item.status)}</span>
                </button>
              ))}
              {crits.length === 0 && <span className="muted small">{U.nothingYet}</span>}
            </div>)}
            {band(U.deliverables, "b-del", <div className="pu-row">
              {dels.map(({ item, depth }) => (
                <button key={item.id} type="button" ref={ref(item.id)} className={nodeCls(item.id, "del", depth)} onClick={() => pick(item.id)} title={item.title}>
                  <span className="id">{depth ? "↳ " : ""}{item.id}</span><span className="pu-t">{item.title || "…"}</span>
                  <span className="pu-meta">{[person(item.owner), item.due, depth > 0 && item.parent ? `${U.under} ${item.parent}` : ""].filter(Boolean).join(" · ")}</span>
                  <span className={"pu-status s-" + item.status.replace(/\s+/g, "-").toLowerCase()}>{tv(lang, item.status)}</span>
                </button>
              ))}
              {dels.length === 0 && <span className="muted small">{U.nothingYet}</span>}
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
                <li key={g.id + i}><button type="button" className="linked-row" onClick={() => select(g.id)}>
                  <span className="id">{g.id === ROOT ? U.purpose : g.id}</span><span className="grow"><b>{g.id === ROOT ? "" : title(g.id)}</b> {g.text}</span>
                </button></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
