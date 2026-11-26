import { useState } from "react";
import { tv } from "../i18n";
import { addCat, moveCat, removeCat, renameCat, usedBy, type CatKind } from "../lib/categories";
import { useStore } from "../state/store";
import { t } from "../i18n";
import { useApp } from "./ui";

/** An editable list of group names: rename in place, reorder, remove and
 *  add. It only shows and asks; the caller decides what each change does,
 *  so the same editor serves a project and the new-project setup. */
export function ListEditor({ title, items, count, onAdd, onRename, onRemove, onMove }: {
  title: string;
  items: string[];
  count: (name: string) => number;
  onAdd: (name: string) => boolean;
  onRename: (from: string, to: string) => boolean;
  onRemove: (name: string) => void;
  onMove: (name: string, dir: -1 | 1) => void;
}) {
  const lang = useStore((s) => s.lang);
  const T = t(lang);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const add = () => {
    if (onAdd(name)) { setName(""); setErr(""); } else setErr(name.trim() ? T.catExists : "");
  };
  return (
    <div className="cat-editor">
      <div className="sub-h m0">{title}</div>
      <ul className="cat-list">
        {items.map((c, i) => {
          const n = count(c);
          return (
            <li key={c + lang}>
              <input className="input" aria-label={`${title}: ${tv(lang, c)}`} defaultValue={tv(lang, c)}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v || v === tv(lang, c)) { e.target.value = tv(lang, c); return; }
                  if (!onRename(c, v)) { e.target.value = tv(lang, c); setErr(T.catExists); }
                }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} />
              <span className="muted small nowrap" title={T.catUsed}>{n}</span>
              <button type="button" className="icon-x" aria-label={`${T.moveUp}: ${tv(lang, c)}`} disabled={i === 0} onClick={() => onMove(c, -1)}>↑</button>
              <button type="button" className="icon-x" aria-label={`${T.del}: ${tv(lang, c)}`}
                onClick={() => { if (n === 0 || window.confirm(n === 1 ? T.catRemoveConfirmOne : T.catRemoveConfirm.replace("{n}", String(n)))) onRemove(c); }}>×</button>
            </li>
          );
        })}
      </ul>
      <div className="add-row">
        <input className="input grow" aria-label={`${T.add}: ${title}`} placeholder={T.newGroupPh} value={name}
          onChange={(e) => { setName(e.target.value); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="btn ghost small" onClick={add} disabled={!name.trim()}>+ {T.add}</button>
      </div>
      {err && <span className="err small" role="alert">{err}</span>}
    </div>
  );
}

/** The list editor bound to one of the project's own category lists. */
export function CategoryEditor({ kind, title }: { kind: CatKind; title: string }) {
  const { p, update } = useApp();
  const run = (fn: (d: typeof p) => boolean | void) => { let ok = true; update((d) => { ok = fn(d) !== false; }); return ok; };
  return (
    <ListEditor title={title} items={p[kind]} count={(c) => usedBy(p, kind, c)}
      onAdd={(n) => run((d) => addCat(d, kind, n))}
      onRename={(a, b) => run((d) => renameCat(d, kind, a, b))}
      onRemove={(c) => run((d) => removeCat(d, kind, c))}
      onMove={(c, dir) => run((d) => moveCat(d, kind, c, dir))} />
  );
}
