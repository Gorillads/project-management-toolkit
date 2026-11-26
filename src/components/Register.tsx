import { useEffect, useRef, type ReactNode } from "react";
import type { AnyItem, CollKey } from "../model/types";
import { nextId, refsOf } from "../lib/links";
import { Chips, ItemEditor, rowClass, useApp, type Field } from "./ui";

export interface Col<T> { h: string; r: (x: T) => ReactNode }

/** A table of one register plus an editor for the selected row. Every
 *  register in the app (issues, decisions, benefits…) is this component
 *  with its own columns and fields. */
export function Register<T extends AnyItem>({ coll, items, cols, fields, make, extraDetail, hideLinksCol }: {
  coll: CollKey; items?: T[]; cols: Col<T>[]; fields: Field[]; make: (id: string) => T; extraDetail?: (x: T) => ReactNode; hideLinksCol?: boolean;
}) {
  const { p, T, ui, setUi, update } = useApp();
  const rows = items ?? (p[coll] as unknown as T[]);
  const selId = ui.sel[ui.view];
  const sel = (p[coll] as AnyItem[]).find((x) => x.id === selId) as T | undefined;
  const flashRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => { flashRef.current?.scrollIntoView({ block: "center" }); }, [ui.flash]);
  const pick = (id: string) => setUi({ sel: { ...ui.sel, [ui.view]: id }, flash: undefined });
  const add = () => {
    const id = nextId(p, coll);
    update((d) => { (d[coll] as AnyItem[]).push(make(id)); });
    setUi({ sel: { ...ui.sel, [ui.view]: id }, flash: undefined });
  };
  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-head"><h3>{T.tools[ui.view] ?? ""}</h3><button type="button" className="btn small" onClick={add}>+ {T.add}</button></div>
        <div className="scroll-x">
          <table>
            <thead><tr><th>{T.id}</th>{cols.map((c) => <th key={c.h}>{c.h}</th>)}{!hideLinksCol && <th>{T.links}</th>}</tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={cols.length + 2} className="empty">{T.empty}</td></tr>}
              {rows.map((x) => {
                const r = x as unknown as Record<string, unknown>;
                const skip = [r.from, r.owner, r.by, r.stakeholder, ...(Array.isArray(r.owners) ? r.owners : [])];
                return (
                  <tr key={x.id} ref={ui.flash === x.id ? flashRef : undefined} data-row={x.id} className={rowClass(selId === x.id, ui.flash === x.id)} onClick={() => pick(x.id)}>
                    <td><span className="id">{x.id}</span></td>
                    {cols.map((c) => <td key={c.h}>{c.r(x)}</td>)}
                    {!hideLinksCol && <td><Chips ids={refsOf(p, x.id).filter((i) => !skip.includes(i))} /></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        {sel ? (
          <div className="detail">
            <div><span className="id">{sel.id}</span><h4>{sel.title || "…"}</h4></div>
            {extraDetail?.(sel)}
            <ItemEditor coll={coll} item={sel} fields={fields} />
          </div>
        ) : <div className="empty">{T.selectHint}</div>}
      </div>
    </div>
  );
}
