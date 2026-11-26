import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AnyItem, CollKey, Project } from "../model/types";
import { useProject, useStore } from "../state/store";
import { t, tv } from "../i18n";
import { PREFIX } from "../data/catalog";
import { COLLS, chooseId, cleanId, deleteItem, indexOf, isAutoId, kindOf, nextId, ownersOf, partyName, refsOf, renameId, isGroupRef, groupRef, GROUP, type Owned } from "../lib/links";

export function useApp() {
  const p = useProject();
  const lang = useStore((s) => s.lang);
  const ui = useStore((s) => s.ui);
  const update = useStore((s) => s.update);
  const go = useStore((s) => s.go);
  const setUi = useStore((s) => s.setUi);
  return { p, lang, T: t(lang), ui, update, go, setUi };
}

export const LinkIcon = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 3.5H3.2A1.7 1.7 0 0 0 1.5 5.2v3.6a1.7 1.7 0 0 0 1.7 1.7h3.6a1.7 1.7 0 0 0 1.7-1.7V7M7 1.5h3.5V5M10.5 1.5 5.5 6.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** Jump from wherever you are to the item itself, in its own tool. */
export function useGoto() {
  const { go, p } = useApp();
  return (id: string) => {
    const pre = kindOf(p, id);
    const v = PREFIX[pre]?.view;
    if (!v) return;
    if (pre === "A") go("riskanalysis", id, { rSub: "assumptions" });
    else go(v, id);
  };
}

export function Chip({ id, full, onRemove }: { id: string; full?: boolean; onRemove?: () => void }) {
  const { p, T } = useApp();
  const goto = useGoto();
  const it = indexOf(p).all.get(id);
  if (!it) return null;
  const pre = kindOf(p, id);
  const label = full ? `${id} ${it.title}` : pre === "S" || pre === "P" ? it.title : id;
  return (
    <span className={"link-chip" + (pre === "P" ? " is-person" : "")}>
      <button type="button" onClick={(e) => { e.stopPropagation(); goto(id); }} title={`${T.tools[PREFIX[pre].view]}: ${it.title}`}>
        <LinkIcon />{label}
      </button>
      {onRemove && <button type="button" className="chip-x" aria-label={T.del} onClick={(e) => { e.stopPropagation(); onRemove(); }}>×</button>}
    </span>
  );
}
export const Chips = ({ ids, full }: { ids: string[]; full?: boolean }) =>
  ids.length ? <div className="chips">{ids.map((i) => <Chip key={i} id={i} full={full} />)}</div> : null;

/** Grouped select over every item in the project, for adding links. */
export function ItemSelect({ value, onChange, only, exclude = [], placeholder, id }: { value?: string; onChange: (v: string) => void; only?: CollKey[]; exclude?: string[]; placeholder?: string; id?: string }) {
  const { p, T } = useApp();
  return (
    <select id={id} className="sel" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder ?? T.none}</option>
      {(only ?? COLLS).map((c) => {
        const items = (p[c] as AnyItem[]).filter((x) => !exclude.includes(x.id));
        if (!items.length) return null;
        return (
          <optgroup key={c} label={T.tools[PREFIX[Object.keys(PREFIX).find((k) => PREFIX[k].coll === c)!].view] + (c === "assumptions" ? " · " + T.assumptions : "")}>
            {items.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.title}</option>)}
          </optgroup>
        );
      })}
    </select>
  );
}

export function LinkEditor({ ids, onChange, self }: { ids: string[]; onChange: (ids: string[]) => void; self?: string }) {
  const { T } = useApp();
  return (
    <div className="link-editor">
      <div className="chips">{ids.map((i) => <Chip key={i} id={i} onRemove={() => onChange(ids.filter((x) => x !== i))} />)}</div>
      <ItemSelect value="" placeholder={T.addLink} exclude={[...ids, ...(self ? [self] : [])]} onChange={(v) => v && onChange([...ids, v])} />
    </div>
  );
}

export function Backlinks({ id, skip = [] }: { id: string; skip?: string[] }) {
  const { p, T } = useApp();
  const groups: Record<string, string[]> = {};
  for (const x of refsOf(p, id)) { const k = kindOf(p, x); if (!skip.includes(k)) (groups[k] ??= []).push(x); }
  const keys = Object.keys(groups);
  if (!keys.length) return <div className="empty">{T.empty}</div>;
  return (
    <div className="stack-s">
      {keys.map((k) => (
        <div className="kv kv-wide" key={k}><span className="dt">{k === "A" ? T.assumptions : T.tools[PREFIX[k].view]}</span><Chips ids={groups[k]} full={k !== "P" && k !== "S"} /></div>
      ))}
    </div>
  );
}

export const Sev = ({ s }: { s: number }) => {
  const { T } = useApp();
  const k = s >= 15 ? "high" : s >= 8 ? "med" : "low";
  return <span className={"badge sev " + k}>{T[k as "high"]} · {s}</span>;
};
const STATUS_TONE: Record<string, string> = { Open: "med", "In progress": "med", Escalated: "high", Closed: "low", Approved: "low", Rejected: "high", "Under review": "med", Confirmed: "low", Unverified: "med", "At risk": "high", "In talks": "med", Broken: "high", High: "high", Medium: "med", Low: "low", Mitigating: "med", Watching: "low", Decided: "low" };
export const Status = ({ v }: { v: string }) => {
  const { lang } = useApp();
  const tone = STATUS_TONE[v];
  return <span className={"badge" + (tone ? " sev " + tone : "")}>{tv(lang, v)}</span>;
};

export function ViewHead({ id, children }: { id: string; children?: ReactNode }) {
  const { T } = useApp();
  return (
    <div className="view-head">
      <div><h2>{T.tools[id]}</h2><p>{T.blurbs[id]}</p></div>
      {children && <div className="tags">{children}</div>}
    </div>
  );
}

export function ScoreSelect({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <select className="sel mini" aria-label={label} value={value ?? 1} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange(+e.target.value)}>
      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

/** The schema-driven editor every register shares. */
export type FieldType = "text" | "textarea" | "select" | "num" | "date" | "bool" | "ref" | "links" | "owners";
export interface Field {
  k: string;
  label: string;
  type: FieldType;
  options?: { v: string; l: string }[];
  only?: CollKey[];
}
export function ItemEditor({ coll, item, fields }: { coll: CollKey; item: AnyItem; fields: Field[] }) {
  const { T, update, setUi, ui } = useApp();
  const set = (k: string, v: unknown) =>
    update((p) => {
      const it = (p[coll] as AnyItem[]).find((x) => x.id === item.id) as unknown as Record<string, unknown>;
      if (!it) return;
      // Clearing a text field leaves an empty string; only a cleared
      // reference (owner, decided by…) is removed, since "" is not an ID.
      const isRef = fields.find((f) => f.k === k)?.type === "ref";
      if (v === "" && isRef) delete it[k]; else it[k] = v;
    });
  const rec = item as unknown as Record<string, unknown>;
  return (
    <div className="editor">
      <IdField coll={coll} id={item.id} />
      {fields.map((f) => {
        const fid = `f-${item.id}-${f.k}`;
        const v = rec[f.k];
        let input: ReactNode;
        if (f.type === "textarea") input = <textarea id={fid} className="input" rows={3} value={(v as string) ?? ""} onChange={(e) => set(f.k, e.target.value)} />;
        else if (f.type === "select") input = <select id={fid} className="sel" value={(v as string) ?? ""} onChange={(e) => set(f.k, e.target.value)}>{f.options!.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>;
        else if (f.type === "num") input = <input id={fid} className="input" type="number" value={(v as number) ?? 0} onChange={(e) => set(f.k, +e.target.value)} />;
        else if (f.type === "date") input = <input id={fid} className="input" type="date" value={(v as string) ?? ""} onChange={(e) => set(f.k, e.target.value)} />;
        else if (f.type === "bool") input = <input id={fid} type="checkbox" checked={!!v} onChange={(e) => set(f.k, e.target.checked)} />;
        else if (f.type === "ref") input = <ItemSelect id={fid} value={v as string} only={f.only} exclude={[item.id]} onChange={(x) => set(f.k, x)} />;
        else if (f.type === "owners") input = <OwnersEditor id={fid} item={item as unknown as Owned} withStakeholders={coll === "decisions"} onChange={(owners, owner) => update((p) => {
          const it = (p[coll] as AnyItem[]).find((x) => x.id === item.id) as unknown as Owned | undefined;
          if (!it) return;
          it.owners = owners;
          if (owner) it.owner = owner; else delete it.owner;
        })} />;
        else if (f.type === "links") input = <LinkEditor ids={item.links} self={item.id} onChange={(ids) => set("links", ids)} />;
        else input = <input id={fid} className="input" value={(v as string) ?? ""} onChange={(e) => set(f.k, e.target.value)} />;
        return (
          <div className={"field-row" + (f.type === "bool" ? " inline" : "")} key={f.k}>
            <label htmlFor={fid}>{f.label}</label>{input}
          </div>
        );
      })}
      <div className="editor-actions">
        <button type="button" className="btn danger small" onClick={() => {
          if (!window.confirm(T.confirmDelete)) return;
          update((p) => deleteItem(p, item.id));
          setUi({ sel: { ...ui.sel, [ui.view]: undefined } });
        }}>{T.del}</button>
      </div>
    </div>
  );
}

/** A person, stakeholder or group as a chip. Groups are "group:<name>". */
export function Party({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const { lang, T } = useApp();
  if (!isGroupRef(id)) return <Chip id={id} onRemove={onRemove} />;
  return (
    <span className="link-chip is-group" title={T.groupsWord}>
      <span className="grp-label">{tv(lang, id.slice(GROUP.length))}</span>
      {onRemove && <button type="button" className="chip-x" aria-label={T.del} onClick={(e) => { e.stopPropagation(); onRemove(); }}>×</button>}
    </span>
  );
}

/** Owners of anything someone is responsible for: any number of people or
 *  groups; marking one as the primary owner is optional (click the star
 *  again to clear it). Decisions can also be owned by stakeholders. */
export function OwnersEditor({ item, onChange, id, withStakeholders }: { item: Owned; onChange: (owners: string[], owner?: string) => void; id?: string; withStakeholders?: boolean }) {
  const { p, lang, T } = useApp();
  const list = ownersOf(item);
  const free = (xs: string[]) => xs.filter((x) => !item.owners.includes(x));
  const teamGroups = free(p.pGroups.filter(Boolean).map(groupRef));
  const stakeGroups = withStakeholders ? free(p.sCats.filter((c) => c && !p.pGroups.includes(c)).map(groupRef)) : [];
  const people = p.people.filter((x) => !item.owners.includes(x.id));
  const stakes = withStakeholders ? p.stakeholders.filter((x) => !item.owners.includes(x.id)) : [];
  return (
    <div className="owners-ed">
      {list.length > 0 && (
        <ul className="owner-list">
          {list.map((o) => {
            const prim = o === item.owner;
            const name = partyName(p, o, (v) => tv(lang, v));
            return (
              <li key={o} className={prim ? "primary" : ""}>
                <button type="button" className="star-btn" aria-pressed={prim} title={prim ? T.clearPrimary : T.makePrimary} aria-label={(prim ? T.clearPrimary : T.makePrimary) + ": " + name}
                  onClick={() => onChange(item.owners, prim ? undefined : o)}>{prim ? "★" : "☆"}</button>
                <Party id={o} onRemove={() => onChange(item.owners.filter((x) => x !== o), prim ? undefined : item.owner)} />
                {prim && <span className="muted small">{T.primaryOwner}</span>}
              </li>
            );
          })}
        </ul>
      )}
      <select id={id} className="sel" value="" onChange={(e) => e.target.value && onChange([...item.owners, e.target.value], item.owner)}>
        <option value="">+ {T.addOwner}</option>
        {teamGroups.length > 0 && <optgroup label={T.teamGroups}>{teamGroups.map((g) => <option key={g} value={g}>{tv(lang, g.slice(GROUP.length))}</option>)}</optgroup>}
        {people.length > 0 && <optgroup label={T.teamMembers}>{people.map((x) => <option key={x.id} value={x.id}>{x.title || x.id}{x.role ? " · " + x.role : ""}</option>)}</optgroup>}
        {stakeGroups.length > 0 && <optgroup label={T.stakeholderGroups}>{stakeGroups.map((g) => <option key={g} value={g}>{tv(lang, g.slice(GROUP.length))}</option>)}</optgroup>}
        {stakes.length > 0 && <optgroup label={T.stakeholdersWord}>{stakes.map((x) => <option key={x.id} value={x.id}>{x.title || x.id}</option>)}</optgroup>}
      </select>
      {list.length > 1 && !item.owner && <span className="muted small">{T.primaryHint}</span>}
    </div>
  );
}

/** Owner chips for tables: the primary owner first, marked with a star. */
export function OwnerChips({ item }: { item: Owned }) {
  const { T } = useApp();
  return <span className="owner-chips">{ownersOf(item).map((o) => <span key={o} className="owner-chip">{o === item.owner && item.owners.length > 1 && <span className="star" title={T.primaryOwner} aria-label={T.primaryOwner}>★</span>}<Party id={o} /></span>)}</span>;
}

export function useSelected<K extends CollKey>(coll: K): Project[K][number] | undefined {
  const { p, ui } = useApp();
  const id = ui.sel[ui.view];
  return useMemo(() => (p[coll] as AnyItem[]).find((x) => x.id === id) as Project[K][number] | undefined, [p, coll, id]);
}

export const rowClass = (sel: boolean, flash: boolean) => (sel ? "selected" : "") + (flash ? " flash" : "");

/** Add a new item: an optional ID (left empty, the next free one is used)
 *  and its name. Enter in either field adds it. */
export function AddRow({ coll, namePh, onAdd, label }: { coll: CollKey; namePh: string; label: string; onAdd: (id: string, title: string) => void }) {
  const { p, T } = useApp();
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");
  const auto = nextId(p, coll);
  const add = () => {
    const chosen = chooseId(p, coll, id);
    if (!chosen) { setErr(T.idTaken); return; }
    onAdd(chosen, title.trim());
    setId(""); setTitle(""); setErr("");
  };
  const key = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); add(); } };
  return (
    <div className="add-row">
      <input className={"input id-in" + (err ? " invalid" : "")} aria-label={T.idLabel} placeholder={auto} value={id} title={T.idHint} onChange={(e) => { setId(e.target.value); setErr(""); }} onKeyDown={key} />
      <input className="input grow" aria-label={namePh} placeholder={namePh} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={key} />
      <button type="button" className="btn small" onClick={add}>+ {label}</button>
      {err && <span className="err small" role="alert">{err}</span>}
    </div>
  );
}

/** Edit an item's ID. Empty means "pick one for me"; a new ID is carried
 *  into every link that points at the item. */
export function IdField({ coll, id }: { coll: CollKey; id: string }) {
  const { p, T, update, ui, setUi } = useApp();
  const [v, setV] = useState(id);
  const [err, setErr] = useState("");
  useEffect(() => { setV(id); setErr(""); }, [id]);
  const commit = () => {
    const typed = cleanId(v);
    let to = typed;
    if (!typed) to = isAutoId(id, coll) ? id : nextId(p, coll);
    if (to === id) { setV(id); return; }
    if (indexOf(p).all.has(to)) { setErr(T.idTaken); return; }
    update((d) => renameId(d, id, to));
    setUi({ sel: { ...ui.sel, [ui.view]: to } });
  };
  return (
    <div className="field-row">
      <label htmlFor={`id-${id}`}>{T.idLabel}</label>
      <input id={`id-${id}`} className={"input id-in" + (err ? " invalid" : "")} value={v} placeholder={nextId(p, coll)} onChange={(e) => { setV(e.target.value); setErr(""); }}
        onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setV(id); setErr(""); } }} />
      <span className={err ? "err small" : "muted small"} role={err ? "alert" : undefined}>{err || T.idHint}</span>
    </div>
  );
}
