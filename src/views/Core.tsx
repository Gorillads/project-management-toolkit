import { useState } from "react";
import type { Analysis, Lens, Person, Project, Risk, Stakeholder } from "../model/types";
import { tv, type Dict } from "../i18n";
import { RISK_STATUSES } from "../data/catalog";
import { kindOf, openIssueOf, peopleFor, pScore, risksFor, toggleIssue } from "../lib/links";
import { AddRow, Backlinks, Chip, ItemEditor, ScoreSelect, Sev, ViewHead, rowClass, useApp, useGoto, type Field } from "../components/ui";
import { RiskHeat, StakeholderGrid } from "../components/Charts";
import { groupOpts, opts } from "./Registers";
import { CategoryEditor } from "../components/CategoryEditor";

/** The core charts always cover every stakeholder and every risk. */
export const coreAnalysis = (p: Project, T: Dict): Analysis => ({
  id: "core-pi", name: T.powerInterest, scope: "", ids: p.stakeholders.map((s) => s.id), x: "interest", y: "power", grid: 2,
  quads: { hh: T.quads.hh, hl: T.quads.hl, lh: T.quads.lh, ll: T.quads.ll },
});
export const coreLens = (p: Project, T: Dict): Lens => ({ id: "core-pxi", name: T.riskMap, x: "i", y: "p", cats: [...new Set([...p.rCats, ...p.risks.map((r) => r.cat)])], sCat: "" });

const ownedBy = (p: Project, pid: string) => p.risks.filter((r) => r.owner === pid || r.links.includes(pid));

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

export function ActorsView() {
  const { p, lang, T, ui, setUi, update } = useApp();
  const [filter, setFilter] = useState<"all" | "team" | "stake">("all");
  const selId = ui.sel.actors;
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
      <div className="card add-card">
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
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div className="seg small">
              {([["all", T.all, p.people.length + p.stakeholders.length], ["team", T.teamMembers, p.people.length], ["stake", T.stakeholdersWord, p.stakeholders.length]] as const).map(([k, l, n]) => (
                <button key={k} type="button" className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>{l} <span className="muted">{n}</span></button>
              ))}
            </div>
          </div>
          {rows.length === 0 ? <div className="empty">{T.noActorsYet}</div> : (
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
        </div>
        <div className="stack">
          <div className="card">{person ? <PersonDetail x={person} /> : stake ? <StakeholderDetail s={stake} /> : <div className="empty">{T.selectHint}</div>}</div>
          <div className="card"><h3>{T.powerInterest}</h3><StakeholderGrid a={coreAnalysis(p, T)} selected={selId} onPick={pick} /><p className="muted small">{T.splitNote}</p></div>
        </div>
      </div>
    </>
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
    { k: "title", label: T.title, type: "text" },
    { k: "cat", label: T.category, type: "select", options: groupOpts(p.rCats, lang) },
    { k: "status", label: T.status, type: "select", options: opts(RISK_STATUSES, lang) },
    { k: "owner", label: T.owner, type: "ref", only: ["people"] },
    { k: "mit", label: T.mitigation, type: "textarea" },
    { k: "links", label: `${T.affects} (${T.actorsWord.toLowerCase()})`, type: "links" },
    { k: "notes", label: T.notes, type: "textarea" },
  ];
  const sorted = [...p.risks].sort((a, b) => pScore(b) - pScore(a));
  return (
    <>
      <ViewHead id="risks" />
      <div className="card add-card">
        <AddRow coll="risks" label={T.addRiskBtn} namePh={T.riskPh} onAdd={(id, title) => {
          update((d) => { d.risks.push({ id, title, cat: d.rCats[0], mit: "", status: "Open", links: [], sc: Object.fromEntries(d.rDims.map((x) => [x.id, 3])) }); });
          pick(id);
        }} />
        <details className="cat-details">
          <summary>{T.manageCats}</summary>
          <p className="muted small">{T.catHint}</p>
          <CategoryEditor kind="rCats" title={T.riskCats} />
        </details>
      </div>
      <div className="grid-2">
        <div className="card">
          {sorted.length === 0 ? <div className="empty">{T.noRisksYet}</div> : (
            <div className="scroll-x"><table>
              <thead><tr><th>{T.idLabel}</th><th>{T.title}</th><th>{T.probability}</th><th>{T.impact}</th><th>Score</th>{issues && <th>{T.issueFlag}</th>}<th>{T.owner}</th><th>{T.affects}</th></tr></thead>
              <tbody>{sorted.map((r) => {
                const iss = openIssueOf(p, r.id);
                return (
                  <tr key={r.id} data-row={r.id} className={rowClass(selId === r.id, ui.flash === r.id)} onClick={() => pick(r.id)}>
                    <td><span className="id">{r.id}</span></td>
                    <td><b>{r.title || "…"}</b><div className="cat">{[r.cat ? tv(lang, r.cat) : "", tv(lang, r.status)].filter(Boolean).join(" · ")}</div></td>
                    <td><ScoreSelect label={T.probability} value={r.sc.p ?? 3} onChange={(v) => setSc(r.id, "p", v)} /></td>
                    <td><ScoreSelect label={T.impact} value={r.sc.i ?? 3} onChange={(v) => setSc(r.id, "i", v)} /></td>
                    <td><Sev s={pScore(r)} /></td>
                    {issues && <td><button type="button" className="issue-tg" aria-pressed={!!iss} onClick={(e) => { e.stopPropagation(); update((d) => toggleIssue(d, r.id, lang)); }}>⚑{iss ? " " + iss.id : ""}</button></td>}
                    <td>{r.owner && <Chip id={r.owner} />}</td>
                    <td><div className="chips">{r.links.filter((id) => ["S", "P"].includes(kindOf(p, id))).map((id) => <Chip key={id} id={id} />)}</div></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
          <p className="muted small">{T.moreAnalysis}</p>
        </div>
        <div className="stack">
          <div className="card">
            {sel ? (
              <div className="detail">
                <div><span className="id">{sel.id} · {tv(lang, sel.cat)}</span><h4>{sel.title || "…"}</h4></div>
                <div className="row-gap">
                  <span className="muted small">{T.probability}</span><ScoreSelect label={T.probability} value={sel.sc.p ?? 3} onChange={(v) => setSc(sel.id, "p", v)} />
                  <span className="muted small">{T.impact}</span><ScoreSelect label={T.impact} value={sel.sc.i ?? 3} onChange={(v) => setSc(sel.id, "i", v)} />
                  <Sev s={pScore(sel)} />
                </div>
                {p.enabled.length > 3 && <><div className="sub-h">{T.alsoIn}</div><Backlinks id={sel.id} skip={["S", "P"]} /></>}
                <ItemEditor coll="risks" item={sel} fields={fields} />
              </div>
            ) : <div className="empty">{T.selectHint}</div>}
          </div>
          <div className="card"><h3>{T.riskMap}</h3><RiskHeat l={coreLens(p, T)} selected={selId} onPick={pick} /></div>
        </div>
      </div>
    </>
  );
}
