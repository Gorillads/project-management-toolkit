import type { Benefit, Change, Decision, Issue, Lesson } from "../model/types";
import { tv } from "../i18n";
import { CHANGE_STATUSES, ISSUE_STATUSES, PRIORITIES } from "../data/catalog";
import { tplById } from "../data/templates";
import { Register } from "../components/Register";
import { Chip, LinkIcon, Status, ViewHead, useApp, type Field } from "../components/ui";

export const opts = (vals: string[], lang: "da" | "en", blank = false) => [...(blank ? [{ v: "", l: "–" }] : []), ...vals.map((v) => ({ v, l: tv(lang, v) }))];

export function IssuesView() {
  const { p, lang, T, go } = useApp();
  const fields: Field[] = [
    { k: "title", label: T.title, type: "text" },
    { k: "from", label: T.fromRisk, type: "ref", only: ["risks"] },
    { k: "owner", label: T.owner, type: "ref", only: ["people"] },
    { k: "prio", label: T.priority, type: "select", options: opts(PRIORITIES, lang) },
    { k: "status", label: T.status, type: "select", options: opts(ISSUE_STATUSES, lang) },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  const items = [...p.issues].sort((a, b) => Number(a.status === "Closed") - Number(b.status === "Closed"));
  return (
    <>
      <ViewHead id="issues" />
      <div className="card small note">{T.issueHint} <button type="button" className="link-chip solo" onClick={() => go("risks")}><LinkIcon />{T.tools.risks}</button></div>
      <Register<Issue> coll="issues" items={items} fields={fields}
        make={(id) => ({ id, title: "", prio: "Medium", status: "Open", links: [] })}
        cols={[
          { h: T.title, r: (x) => <><b>{x.title}</b>{x.auto && <> <span className="badge">{T.fromFlag}</span></>}</> },
          { h: T.fromRisk, r: (x) => x.from && <Chip id={x.from} /> },
          { h: T.owner, r: (x) => x.owner && <Chip id={x.owner} /> },
          { h: T.priority, r: (x) => <Status v={x.prio} /> },
          { h: T.status, r: (x) => <Status v={x.status} /> },
        ]} />
    </>
  );
}

export function PhaseFlow({ templateId, phase, onPick }: { templateId: string; phase: number; onPick?: (i: number) => void }) {
  const { lang } = useApp();
  const tpl = tplById(templateId);
  return (
    <div className="flow">
      {tpl.phases.map(([n, g], i) => (
        <button type="button" key={i} disabled={!onPick} className={"phase" + (i < phase ? " done" : "") + (i === phase ? " current" : "")} onClick={() => onPick?.(i)}>
          <span className="phase-n">{i + 1}. {n[lang]}</span>
          <span className="gate"><i />{g[lang]}</span>
        </button>
      ))}
    </div>
  );
}

export function DecisionsView() {
  const { p, lang, T, go } = useApp();
  const tpl = tplById(p.templateId);
  const typical = tpl.decisions.map((d) => d[lang]);
  const matches = (x: Decision, d: string) => !!x.tpl && tpl.decisions.some((td) => (td.en === x.tpl || td.da === x.tpl) && (td.en === d || td.da === d));
  const fields: Field[] = [
    { k: "title", label: T.title, type: "text" },
    { k: "date", label: T.date, type: "date" },
    { k: "by", label: T.decidedBy, type: "ref", only: ["people", "stakeholders"] },
    { k: "tpl", label: T.typicalDecision, type: "select", options: [{ v: "", l: "–" }, ...typical.map((d) => ({ v: d, l: d }))] },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  return (
    <>
      <ViewHead id="decisions" />
      <div className="card">
        <div className="card-head"><h3>{T.typicalFor}: {tpl.name[lang]}</h3><button type="button" className="link-chip solo" onClick={() => go("templates")}><LinkIcon />{T.changeTemplate}</button></div>
        <PhaseFlow templateId={p.templateId} phase={p.phase} />
        <table className="mt"><tbody>
          {typical.map((d) => {
            const done = p.decisions.find((x) => matches(x, d));
            return <tr key={d}><td>{d}</td><td className="nowrap right">{done ? <><Status v="Approved" /> <Chip id={done.id} /></> : <span className="badge">{T.ahead}</span>}</td></tr>;
          })}
        </tbody></table>
      </div>
      <Register<Decision> coll="decisions" fields={fields}
        make={(id) => ({ id, title: "", date: new Date().toISOString().slice(0, 10), links: [] })}
        cols={[
          { h: T.title, r: (x) => <b>{x.title}</b> },
          { h: T.date, r: (x) => <span className="num">{x.date}</span> },
          { h: T.decidedBy, r: (x) => x.by && <Chip id={x.by} /> },
        ]} />
    </>
  );
}

export function ChangesView() {
  const { lang, T, p } = useApp();
  const fields: Field[] = [
    { k: "title", label: T.title, type: "text" },
    { k: "by", label: T.requestedBy, type: "ref", only: ["stakeholders", "people"] },
    { k: "cost", label: `${T.cost} (k ${p.currency})`, type: "num" },
    { k: "weeks", label: T.delay, type: "num" },
    { k: "status", label: T.status, type: "select", options: opts(CHANGE_STATUSES, lang) },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  return (
    <>
      <ViewHead id="changes"><span className="opt-tag">{T.optional}</span></ViewHead>
      <Register<Change> coll="changes" fields={fields}
        make={(id) => ({ id, title: "", cost: 0, weeks: 0, status: "Under review", links: [] })}
        cols={[
          { h: T.title, r: (x) => <b>{x.title}</b> },
          { h: T.requestedBy, r: (x) => x.by && <Chip id={x.by} /> },
          { h: T.cost, r: (x) => <span className="num">{x.cost}k</span> },
          { h: T.status, r: (x) => <Status v={x.status} /> },
        ]} />
    </>
  );
}

export function BenefitsView() {
  const { T } = useApp();
  const fields: Field[] = [
    { k: "title", label: T.title, type: "text" },
    { k: "kpi", label: T.kpi, type: "text" },
    { k: "owner", label: T.owner, type: "ref", only: ["people"] },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  return (
    <>
      <ViewHead id="benefits" />
      <Register<Benefit> coll="benefits" fields={fields} make={(id) => ({ id, title: "", kpi: "", links: [] })}
        cols={[{ h: T.title, r: (x) => <b>{x.title}</b> }, { h: T.kpi, r: (x) => x.kpi }, { h: T.owner, r: (x) => x.owner && <Chip id={x.owner} /> }]} />
    </>
  );
}

export function LessonsView() {
  const { T } = useApp();
  const fields: Field[] = [
    { k: "title", label: T.title, type: "text" },
    { k: "source", label: T.source, type: "text" },
    { k: "notes", label: T.notes, type: "textarea" },
    { k: "links", label: T.links, type: "links" },
  ];
  return (
    <>
      <ViewHead id="lessons" />
      <Register<Lesson> coll="lessons" fields={fields} make={(id) => ({ id, title: "", source: "", links: [] })}
        cols={[{ h: T.title, r: (x) => <b>{x.title}</b> }, { h: T.source, r: (x) => <span className="muted">{x.source}</span> }]} />
    </>
  );
}
