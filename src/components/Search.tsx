import { useEffect, useMemo, useRef, useState } from "react";
import { PREFIX } from "../data/catalog";
import { indexOf, kindOf } from "../lib/links";
import { useApp, useGoto } from "./ui";

/** One box that finds any item in the project, by ID or by words in its
 *  title, owner role or notes. Ctrl/Cmd+K focuses it from anywhere. */
export function Search() {
  const { p, T } = useApp();
  const goto = useGoto();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); setOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const out: { id: string; title: string; hay: string; score: number }[] = [];
    for (const { id, title, item } of indexOf(p).all.values()) {
      const r = item as unknown as Record<string, unknown>;
      const hay = [id, title, r.role, r.org, r.notes, r.mit, r.resp, r.kpi].filter((x) => typeof x === "string").join(" ").toLowerCase();
      if (!words.every((w) => hay.includes(w))) continue;
      const score = (id.toLowerCase() === words[0] ? 0 : 1) + (title.toLowerCase().startsWith(words[0]) ? 0 : 1);
      out.push({ id, title, hay, score });
    }
    return out.sort((a, b) => a.score - b.score || a.id.localeCompare(b.id, undefined, { numeric: true })).slice(0, 12);
  }, [q, p]);
  const pick = (id: string) => { goto(id); setQ(""); setOpen(false); input.current?.blur(); };
  return (
    <div className="search" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <input ref={input} className="input search-in" type="search" placeholder={T.searchPh} aria-label={T.search} value={q}
        role="combobox" aria-expanded={open && results.length > 0} aria-controls="search-results"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && results[hi]) pick(results[hi].id);
          else if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
        }} />
      {open && q.trim() && (
        <div className="menu-pop search-pop" id="search-results" role="listbox">
          {results.length === 0 && <div className="menu-status">{T.noResults}</div>}
          {results.map((r, i) => (
            <button key={r.id} type="button" role="option" aria-selected={i === hi} className={"menu-item search-row" + (i === hi ? " hi" : "")} onMouseEnter={() => setHi(i)} onClick={() => pick(r.id)}>
              <span><span className="id">{r.id}</span> {r.title || "…"}</span>
              <small>{kindOf(p, r.id) === "A" ? T.assumptions : T.tools[PREFIX[kindOf(p, r.id)].view]}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
