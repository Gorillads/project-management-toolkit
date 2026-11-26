import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "../state/store";
import { t, tv } from "../i18n";
import { TEMPLATES } from "../data/templates";
import { R_CATS, exampleProject } from "../data/projects";
import { ListEditor } from "./CategoryEditor";
import { activeRows, buildProject, groupAdd, groupCount, groupMove, groupRemove, groupRename, initialAnswers, key, previewIds, templateDefaults, type Answers, type GroupList } from "../lib/wizard";
import { cleanId } from "../lib/links";
import { looksLikeConsequence } from "../lib/riskText";
import { TRIANGLE } from "../data/catalog";

const DRAFT_KEY = "pmt-wizard-draft-v2";
const loadDraft = (): { a: Answers; step: number } | null => { try { const v = localStorage.getItem(DRAFT_KEY); return v ? JSON.parse(v) : null; } catch { return null; } };
const saveDraft = (d: { a: Answers; step: number } | null) => { try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ } };

type RowKind = "people" | "stakes" | "risks";

function Level({ value, onChange, label, five }: { value: number; onChange: (v: number) => void; label: string; five?: boolean }) {
  const lang = useStore((s) => s.lang);
  const W = t(lang).wz.q;
  const options = five ? [1, 2, 3, 4, 5].map((n) => [n, String(n)] as const) : ([[2, W.low], [3, W.med], [4, W.high]] as const);
  return (
    <div className="seg small" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? "active" : ""} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

/** 0 (no effect) to 5 (severe): the consequence on one side of the triangle. */
function Level0({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="seg small" role="radiogroup" aria-label={label}>
      {[0, 1, 2, 3, 4, 5].map((v) => <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? "active" : ""} onClick={() => onChange(v)}>{v === 0 ? "–" : v}</button>)}
    </div>
  );
}

/** Five short steps: the project, its team, its stakeholders, its risks, and
 *  a review. Answers survive closing the dialog until the project is made. */
export function NewProjectWizard({ open, templateId, onClose }: { open: boolean; templateId?: string; onClose: () => void }) {
  const lang = useStore((s) => s.lang);
  const addProject = useStore((s) => s.addProject);
  const T = t(lang);
  const W = T.wz;
  const ref = useRef<HTMLDialogElement>(null);
  const [a, setA] = useState<Answers>(() => initialAnswers(templateId ?? "general", lang));
  const [step, setStep] = useState(0);
  const [resumed, setResumed] = useState(false);
  const [tried, setTried] = useState(false);
  const created = useRef(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      created.current = false;
      const draft = loadDraft();
      const worth = draft && (draft.step > 0 || draft.a.name.trim());
      if (draft && worth && (!templateId || draft.a.templateId === templateId)) { setA({ ...initialAnswers(draft.a.templateId ?? "general", lang), ...draft.a }); setStep(draft.step); setResumed(true); }
      else { setA(initialAnswers(templateId ?? "general", lang)); setStep(0); setResumed(false); }
      setTried(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, templateId, lang]);
  useEffect(() => { if (open && !created.current) saveDraft({ a, step }); }, [a, step, open]);

  const set = (patch: Partial<Answers>) => setA((x) => ({ ...x, ...patch }));
  const setRow = (k: RowKind, rowKey: string, patch: Record<string, unknown>) =>
    setA((x) => ({ ...x, [k]: (x[k] as { key: string }[]).map((r) => (r.key === rowKey ? { ...r, ...patch } : r)) }));
  const delRow = (k: RowKind, rowKey: string) => setA((x) => ({ ...x, [k]: (x[k] as { key: string }[]).filter((r) => r.key !== rowKey) }));

  const create = () => {
    if (!a.name.trim()) { setTried(true); setStep(0); return; }
    addProject(buildProject(a, lang));
    created.current = true;
    saveDraft(null);
    setA(initialAnswers("general", lang));
    setStep(0);
    onClose();
  };
  const next = () => { if (step === 0 && !a.name.trim()) { setTried(true); return; } setStep(step + 1); };
  const last = W.steps.length - 1;
  const rows = activeRows(a);
  const ids = previewIds(a);
  // A typed ID used by two rows: the second one falls back to an automatic ID.
  const typedCount = new Map<string, number>();
  [...a.people, ...a.stakes, ...a.risks].forEach((r) => { const c = cleanId(r.id); if (c) typedCount.set(c, (typedCount.get(c) ?? 0) + 1); });
  const idInput = (k: RowKind, rowKey: string, value: string, label: string) => (
    <input className={"input id-in" + ((typedCount.get(cleanId(value)) ?? 0) > 1 ? " invalid" : "")} aria-label={`${T.idLabel} · ${label}`} title={T.idHint}
      placeholder={ids.get(rowKey) ?? ""} value={value} onChange={(e) => setRow(k, rowKey, { id: e.target.value })} />
  );
  const field = (fid: string, text: string, el: ReactNode, hint?: string) => (
    <div className="field-row"><label htmlFor={fid}>{text}</label>{el}{hint && <span className="err small">{hint}</span>}</div>
  );

  /** The group list for this step, edited in the answers (not yet a project). */
  const groupEditor = (k: GroupList, title: string) => (
    <details className="cat-details wz-groups">
      <summary>{T.manageGroups}</summary>
      <p className="muted small">{T.catHint}</p>
      <ListEditor title={title} items={a[k]} count={(c) => groupCount(a, k, c)}
        onAdd={(n) => { const r = groupAdd(a, k, n); if (r) setA(r); return !!r; }}
        onRename={(x, y) => { const r = groupRename(a, k, x, y); if (r) setA(r); return !!r; }}
        onRemove={(c) => setA(groupRemove(a, k, c))}
        onMove={(c, dir) => setA(groupMove(a, k, c, dir))} />
    </details>
  );

  let body: ReactNode = null;
  if (step === 0) body = (
    <>
      <h2>{W.q.project}</h2>
      <div className="wz-grid">
        {field("wz-name", W.q.name, <input id="wz-name" className={"input" + (tried && !a.name.trim() ? " invalid" : "")} value={a.name} autoFocus onChange={(e) => set({ name: e.target.value })} aria-invalid={tried && !a.name.trim()} />, tried && !a.name.trim() ? W.q.nameRequired : undefined)}
        {field("wz-org", W.q.org, <input id="wz-org" className="input" value={a.org} onChange={(e) => set({ org: e.target.value })} />)}
      </div>
      {field("wz-purpose", W.q.purpose, <textarea id="wz-purpose" className="input" rows={2} placeholder={W.q.purposePh} value={a.purpose} onChange={(e) => set({ purpose: e.target.value })} />)}
      <div className="sub-h">{W.q.typeLabel}</div>
      <p className="muted small m0">{W.q.typeHint}</p>
      <div className="wz-types">
        {TEMPLATES.map((x) => (
          <button key={x.id} type="button" className={"tpl" + (a.templateId === x.id ? " active" : "")} aria-pressed={a.templateId === x.id} onClick={() => setA((y) => ({ ...y, templateId: x.id, ...templateDefaults(x.id, lang) }))}>
            <b>{x.name[lang]}</b><small>{x.desc[lang]}</small>
          </button>
        ))}
      </div>
      <button type="button" className="link-btn" onClick={() => { addProject(exampleProject()); created.current = true; saveDraft(null); onClose(); }}>{W.q.openExample} →</button>
    </>
  );
  if (step === 1) body = (
    <>
      <h2>{W.q.people}</h2><p className="muted">{W.q.peopleHint}</p>
      <div className="wz-table">
        <div className="wz-head people"><span>{T.idLabel}</span><span>{W.q.name2}</span><span>{W.q.role}</span><span>{W.q.group}</span><span /></div>
        {a.people.map((x, i) => (
          <div key={x.key} className="wz-line people">
            {idInput("people", x.key, x.id, `${W.q.name2} ${i + 1}`)}
            <input className="input" aria-label={`${W.q.name2} ${i + 1}`} value={x.name} onChange={(e) => setRow("people", x.key, { name: e.target.value })} autoFocus={i === 0} />
            <input className="input" aria-label={`${W.q.role} ${i + 1}`} value={x.role} onChange={(e) => setRow("people", x.key, { role: e.target.value })} />
            <select className="sel" aria-label={`${W.q.group} ${i + 1}`} value={x.group} onChange={(e) => setRow("people", x.key, { group: e.target.value })}><option value="">{T.noGroup}</option>{a.pGroups.map((g) => <option key={g} value={g}>{tv(lang, g)}</option>)}</select>
            <button type="button" className="icon-x" aria-label={T.del} onClick={() => delRow("people", x.key)}>×</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost small self-start" onClick={() => set({ people: [...a.people, { key: key(), id: "", name: "", role: "", group: "" }] })}>+ {W.q.addPerson}</button>
      <p className="muted small m0">{T.idLabel}: {T.idHint}</p>
      {groupEditor("pGroups", T.teamGroups)}
    </>
  );
  if (step === 2) body = (
    <>
      <h2>{W.q.stakes}</h2><p className="muted">{W.q.stakesHint}</p>
      <div className="wz-list">
        {a.stakes.map((x, i) => (
          <div key={x.key} className={"wz-card" + (x.on ? "" : " off")}>
            <div className="wz-row">
              <input type="checkbox" checked={x.on} aria-label={x.name || `${i + 1}`} onChange={(e) => setRow("stakes", x.key, { on: e.target.checked })} />
              {x.on && idInput("stakes", x.key, x.id, x.name || `${i + 1}`)}
              <input className="input grow" aria-label={`${T.name} ${i + 1}`} value={x.name} onChange={(e) => setRow("stakes", x.key, { name: e.target.value })} />
              <select className="sel" aria-label={T.group} value={x.cat} onChange={(e) => setRow("stakes", x.key, { cat: e.target.value })}><option value="">{T.noGroup}</option>{a.sCats.map((c) => <option key={c} value={c}>{tv(lang, c)}</option>)}</select>
              <select className="sel" aria-label={T.type} value={x.type} onChange={(e) => setRow("stakes", x.key, { type: e.target.value })}><option value="Internal">{T.internal}</option><option value="External">{T.external}</option></select>
            </div>
            {x.on && <div className="wz-row wz-scores"><span className="muted small">{W.q.power}</span><Level label={W.q.power} value={x.power} onChange={(v) => setRow("stakes", x.key, { power: v })} /><span className="muted small">{W.q.interest}</span><Level label={W.q.interest} value={x.interest} onChange={(v) => setRow("stakes", x.key, { interest: v })} /></div>}
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost small self-start" onClick={() => set({ stakes: [...a.stakes, { key: key(), id: "", name: "", cat: "", type: "Internal", power: 3, interest: 3, on: true }] })}>+ {W.q.addStake}</button>
      {groupEditor("sCats", T.stakeholderGroups)}
    </>
  );
  if (step === 3) body = (
    <>
      <h2>{W.q.risks}</h2><p className="muted">{W.q.risksHint}</p>
      <div className="wz-list">
        {a.risks.map((x, i) => (
          <div key={x.key} className={"wz-card" + (x.on ? "" : " off")}>
            <div className="wz-row">
              <input type="checkbox" checked={x.on} aria-label={x.title || `${i + 1}`} onChange={(e) => setRow("risks", x.key, { on: e.target.checked })} />
              {x.on && idInput("risks", x.key, x.id, x.title || `${i + 1}`)}
              <input className="input grow" aria-label={`${T.title} ${i + 1}`} value={x.title} onChange={(e) => setRow("risks", x.key, { title: e.target.value })} />
              <select className="sel" aria-label={T.category} value={x.cat} onChange={(e) => setRow("risks", x.key, { cat: e.target.value })}>{R_CATS.map((c) => <option key={c} value={c}>{tv(lang, c)}</option>)}</select>
            </div>
            {x.on && <>
              <input className="input wz-mit" aria-label={`${W.q.cause} ${i + 1}`} placeholder={W.q.cause} value={x.cause} onChange={(e) => setRow("risks", x.key, { cause: e.target.value })} />
              {looksLikeConsequence(x.title, x.cause) && <p className="nudge wz-mit">{T.tri.nudge}</p>}
              <div className="wz-row wz-scores">
                <span className="muted small">{W.q.prob}</span><Level five label={W.q.prob} value={x.p} onChange={(v) => setRow("risks", x.key, { p: v })} />
              </div>
              <div className="wz-row wz-scores tri-row">
                <span className="muted small">{T.tri.consequence}:</span>
                {TRIANGLE.map((t) => (
                  <span key={t.key} className="tri-pick"><span className="small">{t[lang]}</span><Level0 label={`${T.tri.consequence} ${t[lang]}`} value={x[t.key]} onChange={(v) => setRow("risks", x.key, { [t.key]: v })} /></span>
                ))}
                {(() => { const s = x.p * Math.max(1, x.fin, x.sched, x.res); return <span className={"badge sev " + (s >= 15 ? "high" : s >= 8 ? "med" : "low")} title={T.tri.scoreHint}>{s}</span>; })()}
              </div>
              <div className="wz-row wz-scores">
                <span className="muted small">{W.q.owner}</span>
                <select className="sel" aria-label={W.q.owner} value={x.owner} onChange={(e) => setRow("risks", x.key, { owner: e.target.value })}><option value="">–</option>{rows.people.map((pp) => <option key={pp.key} value={pp.key}>{pp.name || pp.role}</option>)}</select>
              </div>
              {rows.stakes.length > 0 && <div className="wz-row wz-affects"><span className="muted small">{W.q.affects}</span>
                <div className="pills">{rows.stakes.map((s) => {
                  const on = x.affects.includes(s.key);
                  return <button key={s.key} type="button" className={"pill" + (on ? " on" : "")} aria-pressed={on} onClick={() => setRow("risks", x.key, { affects: on ? x.affects.filter((k) => k !== s.key) : [...x.affects, s.key] })}>{s.name}</button>;
                })}</div></div>}
              <input className="input wz-mit" aria-label={`${W.q.mit} ${i + 1}`} placeholder={W.q.mit} value={x.mit} onChange={(e) => setRow("risks", x.key, { mit: e.target.value })} />
            </>}
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost small self-start" onClick={() => set({ risks: [...a.risks, { key: key(), id: "", title: "", cat: "Organisational", cause: "", p: 3, fin: 0, sched: 0, res: 0, owner: "", affects: [], mit: "", on: true }] })}>+ {W.q.addRisk}</button>
    </>
  );
  if (step === 4) {
    const links = rows.risks.reduce((n, r) => n + r.affects.filter((k) => rows.stakes.some((s) => s.key === k)).length, 0);
    const stat: [number, string, number][] = [[rows.people.length, W.summary.people, 1], [rows.stakes.length, W.summary.stakes, 2], [rows.risks.length, W.summary.risks, 3], [links, W.summary.links, 3]];
    const named: [string, string][] = [...rows.people.map((x): [string, string] => [x.key, x.name || x.role]), ...rows.stakes.map((x): [string, string] => [x.key, x.name]), ...rows.risks.map((x): [string, string] => [x.key, x.title])];
    body = (
      <>
        <h2>{W.q.review}</h2><p className="muted">{W.q.reviewHint}</p>
        <div className="wz-review card">
          <h3 className="wz-name">{a.name || "…"}</h3>
          {a.org && <div className="muted">{a.org}</div>}
          {a.purpose && <p>{a.purpose}</p>}
        </div>
        <div className="stats">{stat.map(([v, l, to]) => <button key={l} type="button" className="stat wz-stat" onClick={() => setStep(to)}><div className="v">{v}</div><div className="l">{l}</div></button>)}</div>
        <div className="wz-ids small">{named.map(([k, n]) => <span key={k}><span className="id">{ids.get(k)}</span> {n}</span>)}</div>
      </>
    );
  }

  return (
    <dialog ref={ref} className="wizard" onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby="wz-title">
      <div className="wz-top">
        <h1 id="wz-title">{W.title}</h1>
        <div className="row-gap">
          {resumed && <span className="muted small">{W.resumeNote} <button type="button" className="link-btn" onClick={() => { setA(initialAnswers(a.templateId, lang)); setStep(0); setResumed(false); }}>{W.startOver}</button></span>}
          <button type="button" className="icon-x" aria-label={W.cancel} onClick={onClose}>×</button>
        </div>
      </div>
      <div className="wz-body">
        <ol className="wz-steps">
          {W.steps.map((s, i) => (
            <li key={s}><button type="button" className={(i === step ? "active" : "") + (i < step ? " done" : "")} aria-current={i === step ? "step" : undefined} disabled={i > 0 && !a.name.trim()} onClick={() => setStep(i)}><span className="n">{i + 1}</span>{s}</button></li>
          ))}
        </ol>
        <div className="wz-main">{body}</div>
      </div>
      <div className="wz-foot">
        {step >= 1 && step < last && a.name.trim() ? <button type="button" className="link-btn" onClick={create}>{W.skipAll}</button> : <span />}
        <div className="row-gap">
          {step > 0 && <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>{W.back}</button>}
          {step < last ? <button type="button" className="btn" onClick={next}>{W.next}</button> : <button type="button" className="btn" onClick={create}>{W.create}</button>}
        </div>
      </div>
    </dialog>
  );
}
