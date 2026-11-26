import type { Person } from "../model/types";
import { tv } from "../i18n";
import { ENG_LEVELS } from "../data/catalog";
import { uid } from "../data/projects";
import { GROUP, groupRef, isGroupRef, kindOf, nextId, partyName, peopleFor, piQuad, refsOf, risksFor } from "../lib/links";
import { Chip, Chips, ItemEditor, Party, ViewHead, useApp, type Field } from "../components/ui";
import { groupOpts } from "./Registers";

const initials = (n: string) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function PeopleView() {
  const { p, lang, T, ui, setUi, update } = useApp();
  const sel = p.people.find((x) => x.id === ui.sel.people);
  const fields: Field[] = [
    { k: "title", label: T.name, type: "text" },
    { k: "role", label: T.role, type: "text" },
    { k: "group", label: T.group, type: "select", options: groupOpts(p.pGroups, lang) },
    { k: "org", label: T.org, type: "text" },
    { k: "resp", label: T.resp, type: "textarea" },
    { k: "email", label: T.email, type: "text" },
    { k: "stakeholder", label: T.represents, type: "ref", only: ["stakeholders"] },
    { k: "links", label: T.links, type: "links" },
  ];
  const add = (group: string) => { const id = nextId(p, "people"); update((pp) => { pp.people.push({ id, title: "", role: "", group, org: pp.org, resp: "", links: [] } as Person); }); setUi({ sel: { ...ui.sel, people: id } }); };
  return (
    <>
      <ViewHead id="people" />
      <div className="grid-2 wide-left">
        <div className="dir">
          {[...p.pGroups, ...(p.people.some((x) => !x.group || !p.pGroups.includes(x.group)) ? [""] : [])].map((g) => {
            const ms = g ? p.people.filter((x) => x.group === g) : p.people.filter((x) => !x.group || !p.pGroups.includes(x.group));
            return (
              <div key={g} className="card">
                <div className="card-head"><h3>{g ? tv(lang, g) : T.noGroup} <span className="badge">{ms.length}</span></h3><button type="button" className="btn ghost small" onClick={() => add(g)}>+ {T.add}</button></div>
                {ms.map((x) => {
                  const owns = refsOf(p, x.id).filter((i) => !["S", "P"].includes(kindOf(p, i)));
                  return (
                    <div key={x.id} className={"person" + (sel?.id === x.id ? " selected" : "") + (ui.flash === x.id ? " flash" : "")} onClick={() => setUi({ sel: { ...ui.sel, people: x.id }, flash: undefined })}>
                      <div className="avatar" aria-hidden="true">{initials(x.title) || "?"}</div>
                      <div className="minw0"><b>{x.title || "…"}</b> <span className="r">· {x.role}{x.org ? ", " + x.org : ""}</span>
                        <div className="resp">{x.resp}</div>
                        <div className="chips mt-s">{x.stakeholder && <Chip id={x.stakeholder} />}{owns.slice(0, 6).map((i) => <Chip key={i} id={i} />)}{owns.length > 6 && <span className="badge">+{owns.length - 6}</span>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="card sticky">{sel ? <div className="detail"><div><span className="id">{sel.id}</span><h4>{sel.title || "…"}</h4></div><ItemEditor coll="people" item={sel} fields={fields} /></div> : <div className="empty">{T.selectHint}</div>}</div>
      </div>
    </>
  );
}

const CYCLE: Record<string, "R" | "A" | "C" | "I" | undefined> = { "": "R", R: "A", A: "C", C: "I", I: undefined };
export function RaciView() {
  const { p, lang, T, update } = useApp();
  // Columns are people or team groups ("group:<name>").
  const cols = p.raciPeople.filter((id) => (isGroupRef(id) ? p.pGroups.includes(id.slice(GROUP.length)) : p.people.some((x) => x.id === id)));
  const role = (id: string) => (isGroupRef(id) ? `${p.people.filter((x) => groupRef(x.group ?? "") === id).length} ${T.membersWord}` : (p.people.find((x) => x.id === id) as Person).role);
  const freeGroups = p.pGroups.filter((g) => g && !p.raciPeople.includes(groupRef(g)));
  const freePeople = p.people.filter((x) => !p.raciPeople.includes(x.id));
  return (
    <>
      <ViewHead id="raci" />
      <div className="card">
        <div className="card-head"><span className="muted small">{T.raciHint}</span>
          <div className="row-gap">
            <select className="sel" aria-label={T.addPersonCol} value="" onChange={(e) => { const v = e.target.value; if (v) update((pp) => { pp.raciPeople.push(v); }); }}>
              <option value="">{T.addPersonCol}</option>
              {freeGroups.length > 0 && <optgroup label={T.teamGroups}>{freeGroups.map((g) => <option key={g} value={groupRef(g)}>{tv(lang, g)}</option>)}</optgroup>}
              {freePeople.length > 0 && <optgroup label={T.teamMembers}>{freePeople.map((x) => <option key={x.id} value={x.id}>{x.title || x.id}</option>)}</optgroup>}
            </select>
            <button type="button" className="btn small" onClick={() => update((pp) => { pp.raci.push({ id: uid("X"), task: "", a: {} }); })}>+ {T.addTask}</button>
          </div>
        </div>
        <div className="scroll-x"><table className="raci">
          <thead><tr><th>{T.title}</th>{cols.map((id) => (
            <th key={id}><Party id={id} /><div className="raci-role">{role(id)}</div>
              <button type="button" className="icon-x" aria-label={T.del} onClick={() => update((pp) => { pp.raciPeople = pp.raciPeople.filter((i) => i !== id); })}>×</button></th>
          ))}<th></th></tr></thead>
          <tbody>{p.raci.map((r) => (
            <tr key={r.id}>
              <td><input className="input" aria-label={T.title} value={r.task} onChange={(e) => update((pp) => { pp.raci.find((x) => x.id === r.id)!.task = e.target.value; })} /></td>
              {cols.map((id) => (
                <td key={id}><button type="button" className={"raci-l " + (r.a[id] ? "raci-" + r.a[id] : "raci-empty")} aria-label={`${r.task} · ${partyName(p, id, (v) => tv(lang, v))}`}
                  onClick={() => update((pp) => {
                    const row = pp.raci.find((y) => y.id === r.id)!;
                    const n = CYCLE[row.a[id] ?? ""];
                    if (n) row.a[id] = n; else delete row.a[id];
                    // Accountable is the optional primary owner: one per row.
                    // Whoever held it before stays Responsible.
                    if (n === "A") for (const k of Object.keys(row.a)) if (k !== id && row.a[k] === "A") row.a[k] = "R";
                  })}>{r.a[id] ?? "·"}</button></td>
              ))}
              <td><button type="button" className="icon-x" aria-label={T.del} onClick={() => update((pp) => { pp.raci = pp.raci.filter((x) => x.id !== r.id); })}>×</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </>
  );
}

export function EngagementView() {
  const { p, lang, T, update } = useApp();
  const set = (id: string, k: "engCurrent" | "engDesired", v: number) => update((pp) => { pp.stakeholders.find((s) => s.id === id)![k] = v; });
  return (
    <>
      <ViewHead id="engagement" />
      <div className="card"><div className="scroll-x"><table className="eng">
        <thead><tr><th>{T.stakeholdersWord}</th>{ENG_LEVELS.map((l) => <th key={l.en} className="center">{l[lang]}</th>)}<th>{T.gap}</th></tr></thead>
        <tbody>{p.stakeholders.map((s) => {
          const c = s.engCurrent ?? 2, d = s.engDesired ?? 3;
          return (
            <tr key={s.id}>
              <td><Chip id={s.id} /></td>
              {ENG_LEVELS.map((l, i) => (
                <td key={l.en} className="lvl">
                  <button type="button" className={"mk " + (i === c && i === d ? "cd" : i === c ? "c" : i === d ? "d" : "")} title={`${T.current}: click · ${T.desired}: shift+click`}
                    onClick={(e) => set(s.id, e.shiftKey ? "engDesired" : "engCurrent", i)} onContextMenu={(e) => { e.preventDefault(); set(s.id, "engDesired", i); }}>
                    {i === c && i === d ? "C D" : i === c ? "C" : i === d ? "D" : ""}
                  </button>
                </td>
              ))}
              <td>{d - c > 0 ? <span className={"badge sev " + (d - c >= 2 ? "high" : "med")}>{d - c} {T.steps}</span> : <span className="badge sev low">{T.onTarget}</span>}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
      <p className="muted small">C = {T.current}, D = {T.desired}. {lang === "da" ? "Klik sætter C. Shift-klik eller højreklik sætter D." : "Click sets C. Shift-click or right-click sets D."}</p></div>
    </>
  );
}

export function CommsView() {
  const { p, T, update } = useApp();
  const sorted = [...p.stakeholders].sort((a, b) => (b.sc.power + b.sc.interest) - (a.sc.power + a.sc.interest));
  return (
    <>
      <ViewHead id="comms" />
      <div className="card"><div className="scroll-x"><table>
        <thead><tr><th>{T.stakeholdersWord}</th><th>{T.strategy}</th><th>{T.channel}</th><th>{T.frequency}</th><th>{T.who}</th><th>{T.raise}</th></tr></thead>
        <tbody>{sorted.map((s) => {
          const q = piQuad(s);
          return (
            <tr key={s.id}>
              <td><Chip id={s.id} /></td><td>{T.quads[q]}</td>
              <td><input className="input" aria-label={T.channel} placeholder={T.comms[q][0]} value={s.commsChannel ?? ""} onChange={(e) => update((pp) => { pp.stakeholders.find((x) => x.id === s.id)!.commsChannel = e.target.value; })} /></td>
              <td><input className="input" aria-label={T.frequency} placeholder={T.comms[q][1]} value={s.commsFreq ?? ""} onChange={(e) => update((pp) => { pp.stakeholders.find((x) => x.id === s.id)!.commsFreq = e.target.value; })} /></td>
              <td><Chips ids={peopleFor(p, s.id).map((x) => x.id)} /></td>
              <td><Chips ids={risksFor(p, s.id).map((r) => r.id)} /></td>
            </tr>
          );
        })}</tbody>
      </table></div></div>
    </>
  );
}
