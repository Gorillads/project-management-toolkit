import { useState } from "react";
import type { Analysis, Lens, Person, Project, Risk, Stakeholder } from "../model/types";
import { tv, type Dict } from "../i18n";
import { RISK_STATUSES, TRIANGLE } from "../data/catalog";
import { openIssueOf, peopleFor, pScore, risksFor, toggleIssue } from "../lib/links";
import { AddRow, Backlinks, Chip, ItemEditor, OwnerChips, ScoreSelect, Sev, ViewHead, rowClass, useApp, useGoto, type Field } from "../components/ui";
import { QualityTriangle, RiskHeat, StakeholderGrid } from "../components/Charts";
import { looksLikeConsequence } from "../lib/riskText";
import { groupOpts, opts } from "./Registers";
import { CategoryEditor } from "../components/CategoryEditor";
import { Board } from "../components/Board";
import { RaiseDecision } from "./Decisions";

/** The core charts always cover every stakeholder and every risk. */
export const coreAnalysis = (p: Project, T: Dict): Analysis => ({
  id: "core-pi", name: T.powerInterest, scope: "", ids: p.stakeholders.map((s) => s.id), x: "interest", y: "power", grid: 2,
  quads: { hh: T.quads.hh, hl: T.quads.hl, lh: T.quads.lh, ll: T.quads.ll },
});
export const coreLens = (p: Project, T: Dict): Lens => ({ id: "core-pxi", name: T.riskMap, x: "i", y: "p", cats: [...new Set([...p.rCats, ...p.risks.map((r) => r.cat)])], sCat: "" });

const ownedBy = (p: Project, pid: string) => p.risks.filter((r) => r.owners.includes(pid) || r.links.includes(pid));

function RiskList({ risks }: { risks: Risk[] }) {
  const { T } = useApp();
  const goto = useGoto();
  if (!risks.length) return <div className="empty">{T.none}</div>;
  return (
    <div className="linked-list">
      {[...risks].sort((a, b) => pScore(b) - pScore(a)).map((r) => (
        <button key={r.id} type="button" className="linked-row" onClick={() => goto(r.id)}><span className="id">{r.id}</span><span className="grow">{r.title || "…"}</span><Sev s={pScore(r)} /></button>
      ))}
    </div>
  );
}

function StakeholderDetail({ s }: { s: Stakeholder }) {
  const { p, lang, T, update } = useApp();
  const fields: Field[] = [
    { k: "title", label: T.name, type: "text" },
    { k: "type", label: T.type, type: "select", options: opts(["Internal", "External"], lang) },
    { k: "cat", label: T.group, type: "select", options: groupOpts(p.sCats, lang) },
    { k: "org", label: T.org, type: "text" },
    { k: "need", label: T.need, type: "textarea" },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  const set = (k: string, v: number) => update((d) => { const x = d.stakeholders.find((y) => y.id === s.id); if (x) x.sc[k] = v; });
  return (
    <div className="detail">
      <div><span className="id">{s.id} · {T.stakeholderOne} · {tv(lang, s.type)}{s.cat && tv(lang, s.cat) !== tv(lang, s.type) ? " · " + tv(lang, s.cat) : ""}</span><h4>{s.title || "…"}</h4></div>
      <div className="row-gap">
        <span className="muted small">{T.wz.q.power}</span><ScoreSelect label={T.wz.q.power} value={s.sc.power ?? 3} onChange={(v) => set("power", v)} />
        <span className="muted small">{T.wz.q.interest}</span><ScoreSelect label={T.wz.q.interest} value={s.sc.interest ?? 3} onChange={(v) => set("interest", v)} />
        <span className="badge">{T.quads[(s.sc.power ?? 0) >= 3 ? ((s.sc.interest ?? 0) >= 3 ? "hh" : "hl") : (s.sc.interest ?? 0) >= 3 ? "lh" : "ll"]}</span>
      </div>
      <div className="sub-h">{T.affectedBy} ({risksFor(p, s.id).length})</div>
      <RiskList risks={risksFor(p, s.id)} />
      {peopleFor(p, s.id).length > 0 && <><div className="sub-h">{T.contacts}</div><div className="chips">{peopleFor(p, s.id).map((x) => <Chip key={x.id} id={x.id} />)}</div></>}
      <ItemEditor coll="stakeholders" item={s} fields={fields} />
    </div>
  );
}

function PersonDetail({ x }: { x: Person }) {
  const { p, lang, T } = useApp();
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
  return (
    <div className="detail">
      <div><span className="id">{x.id} · {T.teamMember}{x.group ? " · " + tv(lang, x.group) : ""}{x.role ? " · " + x.role : ""}</span><h4>{x.title || "…"}</h4></div>
      <div className="sub-h">{T.ownsRisks} ({ownedBy(p, x.id).length})</div>
      <RiskList risks={ownedBy(p, x.id)} />
      <ItemEditor coll="people" item={x} fields={fields} />
    </div>
  );
}

/** A group of actors: a team group or a stakeholder group ("" = no group). */
interface Group { key: string; side: "team" | "stake"; name: string; members: string[] }
const groupKey = (side: "team" | "stake", name: string) => `group:${side}:${name}`;
function groupsOf(p: Project): Group[] {
  const make = (side: "team" | "stake", names: string[], items: { id: string; g: string }[]) => {
    const known = names.filter(Boolean);
    const out = known.map((n) => ({ key: groupKey(side, n), side, name: n, members: items.filter((x) => x.g === n).map((x) => x.id) }));
    const loose = items.filter((x) => !known.includes(x.g)).map((x) => x.id);
    if (loose.length) out.push({ key: groupKey(side, ""), side, name: "", members: loose });
    return out;
  };
  return [
    ...make("team", p.pGroups, p.people.map((x) => ({ id: x.id, g: x.group ?? "" }))),
    ...make("stake", p.sCats, p.stakeholders.map((x) => ({ id: x.id, g: x.cat ?? "" }))),
  ];
}
/** Every risk a group is involved in: owned by a member or affecting one. */
const groupRisks = (p: Project, g: Group) => {
  const ids = new Set(g.members);
  return p.risks.filter((r) => r.owners.some((o) => ids.has(o)) || r.links.some((l) => ids.has(l)));
};

function GroupDetail({ g }: { g: Group }) {
  const { p, lang, T, update } = useApp();
  const team = g.side === "team";
  const name = g.name ? tv(lang, g.name) : T.noGroup;
  const stakes = p.stakeholders.filter((s) => g.members.includes(s.id));
  const avg = (k: string) => (stakes.length ? (stakes.reduce((n, s) => n + (s.sc[k] ?? 0), 0) / stakes.length).toFixed(1) : "–");
  const others = (team ? p.people : p.stakeholders).filter((x) => !g.members.includes(x.id));
  const setGroup = (id: string, to: string) => update((d) => {
    if (team) { const x = d.people.find((y) => y.id === id); if (x) x.group = to; }
    else { const x = d.stakeholders.find((y) => y.id === id); if (x) x.cat = to; }
  });
  const risks = groupRisks(p, g);
  return (
    <div className="detail">
      <div><span className="id">{team ? T.teamGroup : T.stakeholderGroup} · {g.members.length} {T.membersWord}</span><h4>{name}</h4></div>
      {!team && stakes.length > 0 && (
        <div className="row-gap">
          <span className="muted small">{T.avgWord} {T.wz.q.power}</span><b>{avg("power")}</b>
          <span className="muted small">{T.avgWord} {T.wz.q.interest}</span><b>{avg("interest")}</b>
        </div>
      )}
      <div className="sub-h">{T.membersTitle}</div>
      {g.members.length ? (
        <div className="chips">{g.members.map((id) => <Chip key={id} id={id} onRemove={g.name ? () => setGroup(id, "") : undefined} />)}</div>
      ) : <div className="empty">{T.none}</div>}
      {g.name && others.length > 0 && (
        <select className="sel" aria-label={T.addMember} value="" onChange={(e) => e.target.value && setGroup(e.target.value, g.name)}>
          <option value="">+ {T.addMember}</option>
          {others.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.title}</option>)}
        </select>
      )}
      <div className="sub-h">{T.groupRisks} ({risks.length})</div>
      <RiskList risks={risks} />
    </div>
  );
}

export function ActorsView() {
  const { p, lang, T, ui, setUi, update } = useApp();
  const [filter, setFilter] = useState<"all" | "team" | "stake">("all");
  const [mode, setMode] = useState<"people" | "groups">(() => (ui.sel.actors?.startsWith("group:") ? "groups" : "people"));
  const selId = ui.sel.actors;
  const allGroups = groupsOf(p);
  const groups = allGroups.filter((g) => filter === "all" || g.side === filter);
  const group = allGroups.find((g) => g.key === selId);
  const pick = (id: string) => setUi({ sel: { ...ui.sel, actors: id }, flash: undefined });
  const person = p.people.find((x) => x.id === selId);
  const stake = p.stakeholders.find((x) => x.id === selId);
  const rows = [
    ...(filter !== "stake" ? p.people.map((x) => ({ id: x.id, name: x.title, kind: T.teamMember, cls: "type-team", sub: [x.role, x.group ? tv(lang, x.group) : ""].filter(Boolean).join(" · "), risks: ownedBy(p, x.id).length })) : []),
    ...(filter !== "team" ? p.stakeholders.map((x) => ({ id: x.id, name: x.title, kind: `${T.stakeholderOne} · ${tv(lang, x.type).toLowerCase()}`, cls: x.type === "Internal" ? "type-int" : "", sub: x.cat ? tv(lang, x.cat) : "", risks: risksFor(p, x.id).length })) : []),
  ];
  return (
    <>
      <ViewHead id="actors" />
      <Board view="actors" split="3:2" panels={[
      { id: "add", title: T.layout.p.add, col: "F", node: <div className="card add-card">
        <AddRow coll="people" label={T.addTeamMember} namePh={T.personPh} onAdd={(id, title) => {
          update((d) => { d.people.push({ id, title, role: "", group: "", org: d.org, resp: "", links: [] }); });
          pick(id);
        }} />
        <AddRow coll="stakeholders" label={T.addStakeholderBtn} namePh={T.stakeholderPh} onAdd={(id, title) => {
          update((d) => {
            const everyone = d.analyses.filter((a) => d.stakeholders.every((s) => a.ids.includes(s.id)));
            d.stakeholders.push({ id, title, cat: "", type: "Internal", org: "", need: "", links: [], sc: Object.fromEntries(d.sDims.map((x) => [x.id, 3])) });
            everyone.forEach((a) => a.ids.push(id));
          });
          pick(id);
        }} />
        <details className="cat-details">
          <summary>{T.manageGroups}</summary>
          <p className="muted small">{T.catHint}</p>
          <div className="two">
            <CategoryEditor kind="pGroups" title={T.teamGroups} />
            <CategoryEditor kind="sCats" title={T.stakeholderGroups} />
          </div>
        </details>
      </div> },
      { id: "list", title: T.layout.p.list, col: "L", node: <div className="card">
          <div className="card-head">
            <div className="seg small" role="group" aria-label={T.viewAs}>
              {([["people", T.individuals], ["groups", T.groupsWord]] as const).map(([k, l]) => (
                <button key={k} type="button" className={mode === k ? "active" : ""} aria-pressed={mode === k} onClick={() => setMode(k)}>{l}</button>
              ))}
            </div>
            <div className="seg small">
              {([["all", T.all, p.people.length + p.stakeholders.length], ["team", T.teamMembers, p.people.length], ["stake", T.stakeholdersWord, p.stakeholders.length]] as const).map(([k, l, n]) => (
                <button key={k} type="button" className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>{l} <span className="muted">{n}</span></button>
              ))}
            </div>
          </div>
          {mode === "groups" ? (groups.length === 0 ? <div className="empty">{T.noActorsYet}</div> : (
            <div className="scroll-x"><table>
              <thead><tr><th>{T.group}</th><th>{T.kind}</th><th>{T.membersTitle}</th><th>{T.risksCol}</th></tr></thead>
              <tbody>{groups.map((g) => {
                const n = groupRisks(p, g).length;
                return (
                  <tr key={g.key} data-row={g.key} className={rowClass(selId === g.key, false)} onClick={() => pick(g.key)}>
                    <td><b>{g.name ? tv(lang, g.name) : <span className="muted">{T.noGroup}</span>}</b></td>
                    <td><span className={"badge " + (g.side === "team" ? "type-team" : "")}>{g.side === "team" ? T.teamGroup : T.stakeholderGroup}</span></td>
                    <td><span className="muted small">{g.members.length}</span> <span className="group-names">{g.members.slice(0, 4).map((id) => p.people.find((x) => x.id === id)?.title ?? p.stakeholders.find((x) => x.id === id)?.title).join(", ")}{g.members.length > 4 ? ", …" : ""}</span></td>
                    <td>{n ? <span className="badge sev med">{n}</span> : <span className="muted small">0</span>}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )) : rows.length === 0 ? <div className="empty">{T.noActorsYet}</div> : (
            <div className="scroll-x"><table>
              <thead><tr><th>{T.idLabel}</th><th>{T.name}</th><th>{T.kind}</th><th>{T.role} / {T.group}</th><th>{T.risksCol}</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} data-row={r.id} className={rowClass(selId === r.id, ui.flash === r.id)} onClick={() => pick(r.id)}>
                  <td><span className="id">{r.id}</span></td><td><b>{r.name || "…"}</b></td>
                  <td><span className={"badge " + r.cls}>{r.kind}</span></td><td className="muted">{r.sub}</td>
                  <td>{r.risks ? <span className="badge sev med">{r.risks}</span> : <span className="muted small">0</span>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div> },
      { id: "details", title: T.layout.p.details, col: "R", node: <div className="card">{person ? <PersonDetail x={person} /> : stake ? <StakeholderDetail s={stake} /> : group ? <GroupDetail g={group} /> : <div className="empty">{T.selectHint}</div>}</div> },
      { id: "grid", title: T.powerInterest, col: "R", node: <div className="card"><h3>{T.powerInterest}</h3><StakeholderGrid a={coreAnalysis(p, T)} selected={selId} highlight={group?.side === "stake" ? group.members : undefined} onPick={pick} /><p className="muted small">{T.splitNote}</p></div> },
      ]} />
    </>
  );
}

/** 0 (no effect) to 5 (severe) on one side of the project triangle. */
function TriSelect({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <select className="sel mini" aria-label={label} value={value ?? 0} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange(+e.target.value)}>
      {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? "–" : n}</option>)}
    </select>
  );
}

export function RisksCoreView() {
  const { p, lang, T, ui, setUi, update } = useApp();
  const selId = ui.sel.risks;
  const sel = p.risks.find((r) => r.id === selId);
  const pick = (id: string) => setUi({ sel: { ...ui.sel, risks: id }, flash: undefined });
  const issues = p.enabled.includes("issues");
  const setSc = (id: string, k: string, v: number) => update((d) => { const r = d.risks.find((x) => x.id === id); if (r) r.sc[k] = v; });
  const fields: Field[] = [
    { k: "title", label: T.tri.whatHappens, type: "text" },
    { k: "cause", label: T.tri.cause, type: "textarea" },
    { k: "consequence", label: T.tri.consequenceText, type: "textarea" },
    { k: "cat", label: T.category, type: "select", options: groupOpts(p.rCats, lang) },
    { k: "status", label: T.status, type: "select", options: opts(RISK_STATUSES, lang) },
    { k: "owners", label: T.owners, type: "owners" },
    { k: "mit", label: T.mitigation, type: "textarea" },
    { k: "links", label: `${T.affects} (${T.actorsWord.toLowerCase()}, ${T.pu.deliverables.toLowerCase()})`, type: "links" },
    { k: "notes", label: T.notes, type: "textarea" },
  ];
  const sorted = [...p.risks].sort((a, b) => pScore(b) - pScore(a));
  const tri = (r: Risk) => TRIANGLE.map((t) => <td key={t.key}><TriSelect label={`${T.tri.consequence} ${t[lang]}`} value={r.sc[t.key] ?? 0} onChange={(v) => setSc(r.id, t.key, v)} /></td>);
  return (
    <>
      <ViewHead id="risks" />
      <Board view="risks" split="2:1" panels={[
      { id: "add", title: T.layout.p.add, col: "F", node: <div className="card add-card">
        <AddRow coll="risks" label={T.addRiskBtn} namePh={T.riskPh} onAdd={(id, title) => {
          update((d) => { d.risks.push({ id, title, cat: "", cause: "", consequence: "", mit: "", status: "Open", owners: [], links: [], sc: { ...Object.fromEntries(d.rDims.map((x) => [x.id, 3])), fin: 0, sched: 0, res: 0 } }); });
          pick(id);
        }} />
        <details className="cat-details">
          <summary>{T.manageCats}</summary>
          <p className="muted small">{T.catHint}</p>
          <CategoryEditor kind="rCats" title={T.riskCats} />
        </details>
      </div> },
      { id: "table", title: T.layout.p.table, col: "L", node: <div className="card">
          {sorted.length === 0 ? <div className="empty">{T.noRisksYet}</div> : (
            <div className="scroll-x"><table className="risk-table">
              <thead>
                <tr><th rowSpan={2}>{T.idLabel}</th><th rowSpan={2}>{T.tri.whatHappens}</th><th rowSpan={2}>{T.probability}</th><th colSpan={3} className="center tri-head">{T.tri.consequence}</th><th rowSpan={2} title={T.tri.scoreHint}>Score</th>{issues && <th rowSpan={2}>{T.issueFlag}</th>}<th rowSpan={2}>{T.owners}</th></tr>
                <tr>{TRIANGLE.map((t) => <th key={t.key} className="center">{t[lang]}</th>)}</tr>
              </thead>
              <tbody>{sorted.map((r) => {
                const iss = openIssueOf(p, r.id);
                return (
                  <tr key={r.id} data-row={r.id} className={rowClass(selId === r.id, ui.flash === r.id)} onClick={() => pick(r.id)}>
                    <td><span className="id">{r.id}</span></td>
                    <td><b>{r.title || "…"}</b>
                      {r.cause ? <div className="cat">{T.tri.causeShort}: {r.cause}</div> : looksLikeConsequence(r.title, r.cause) ? <div className="cat warn-text">⚠ {T.tri.nudge.split(". ")[0]}.</div> : null}
                    </td>
                    <td><ScoreSelect label={T.probability} value={r.sc.p ?? 3} onChange={(v) => setSc(r.id, "p", v)} /></td>
                    {tri(r)}
                    <td><Sev s={pScore(r)} /></td>
                    {issues && <td><button type="button" className="issue-tg" aria-pressed={!!iss} onClick={(e) => { e.stopPropagation(); update((d) => toggleIssue(d, r.id, lang)); }}>⚑{iss ? " " + iss.id : ""}</button></td>}
                    <td><OwnerChips risk={r} /></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
          <p className="muted small">{T.moreAnalysis}</p>
        </div> },
      { id: "details", title: T.layout.p.details, col: "R", node: <div className="card">
            {sel ? (
              <div className="detail">
                <div><span className="id">{sel.id}{sel.cat ? " · " + tv(lang, sel.cat) : ""}</span><h4>{sel.title || "…"}</h4></div>
                {looksLikeConsequence(sel.title, sel.cause) && <p className="nudge">{T.tri.nudge}</p>}
                <div className="risk-scores">
                  <span className="muted small">{T.probability}</span><ScoreSelect label={T.probability} value={sel.sc.p ?? 3} onChange={(v) => setSc(sel.id, "p", v)} />
                  <span className="muted small tri-lbl">{T.tri.consequence}</span>
                  {TRIANGLE.map((t) => <span key={t.key} className="tri-pick"><span className="small">{t[lang]}</span><TriSelect label={`${T.tri.consequence} ${t[lang]}`} value={sel.sc[t.key] ?? 0} onChange={(v) => setSc(sel.id, t.key, v)} /></span>)}
                  <Sev s={pScore(sel)} />
                </div>
                {p.enabled.length > 4 && <><div className="sub-h">{T.alsoIn}</div><Backlinks id={sel.id} skip={["S", "P"]} /></>}
                <RaiseDecision id={sel.id} />
                <ItemEditor coll="risks" item={sel} fields={fields} />
              </div>
            ) : <div className="empty">{T.selectHint}</div>}
          </div> },
      { id: "triangle", title: T.tri.title, col: "R", node: <div className="card"><h3>{T.tri.title}</h3><p className="muted small m0">{T.tri.hint}</p><QualityTriangle selected={selId} onPick={pick} /></div> },
      { id: "heat", title: T.riskMap, col: "R", node: <div className="card"><h3>{T.riskMap}</h3><RiskHeat l={coreLens(p, T)} selected={selId} onPick={pick} /></div> },
      ]} />
    </>
  );
}
