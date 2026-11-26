import { useState } from "react";
import { tv } from "../i18n";
import { addCat, moveCat, removeCat, renameCat, usedBy, type CatKind } from "../lib/categories";
import { useApp } from "./ui";

/** One editable list of groups or categories: rename in place, reorder,
 *  remove (members keep existing, just without a group) and add new ones. */
export function CategoryEditor({ kind, title }: { kind: CatKind; title: string }) {
  const { p, lang, T, update } = useApp();
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const list = p[kind];
  const add = () => {
    let ok = false;
    update((d) => { ok = addCat(d, kind, name); });
    if (ok) { setName(""); setErr(""); } else setErr(name.trim() ? T.catExists : "");
  };
  return (
    <div className="cat-editor">
      <div className="sub-h m0">{title}</div>
      <ul className="cat-list">
        {list.map((c, i) => {
          const n = usedBy(p, kind, c);
          return (
            <li key={c + lang}>
              <input className="input" aria-label={`${title}: ${tv(lang, c)}`} defaultValue={tv(lang, c)}
                onBlur={(e) => { const v = e.target.value.trim(); if (!v || v === tv(lang, c)) { e.target.value = tv(lang, c); return; } let ok = false; update((d) => { ok = renameCat(d, kind, c, v); }); if (!ok) { e.target.value = tv(lang, c); setErr(T.catExists); } }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
              <span className="muted small nowrap" title={T.catUsed}>{n}</span>
              <button type="button" className="icon-x" aria-label={`${T.moveUp}: ${tv(lang, c)}`} disabled={i === 0} onClick={() => update((d) => moveCat(d, kind, c, -1))}>↑</button>
              <button type="button" className="icon-x" aria-label={`${T.del}: ${tv(lang, c)}`}
                onClick={() => { if (n === 0 || window.confirm(n === 1 ? T.catRemoveConfirmOne : T.catRemoveConfirm.replace("{n}", String(n)))) update((d) => removeCat(d, kind, c)); }}>×</button>
            </li>
          );
        })}
      </ul>
      <div className="add-row">
        <input className="input grow" aria-label={`${T.add}: ${title}`} placeholder={T.newGroupPh} value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button type="button" className="btn ghost small" onClick={add} disabled={!name.trim()}>+ {T.add}</button>
      </div>
      {err && <span className="err small" role="alert">{err}</span>}
    </div>
  );
}
