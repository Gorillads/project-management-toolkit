import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "../state/store";
import { t, tv } from "../i18n";
import { TEMPLATES, tplById } from "../data/templates";
import { TOOLS, ALWAYS_ON } from "../data/catalog";
import { P_GROUPS, R_CATS, S_CATS, exampleProject } from "../data/projects";
import { buildProject, gateDates, initialAnswers, key, templateDefaults, type Answers } from "../lib/wizard";

const DRAFT_KEY = "pmt-wizard-draft";
const loadDraft = (): { a: Answers; step: number } | null => { try { const v = localStorage.getItem(DRAFT_KEY); return v ? JSON.parse(v) : null; } catch { return null; } };
const saveDraft = (d: { a: Answers; step: number } | null) => { try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ } };

function Level({ value, onChange, label, five }: { value: number; onChange: (v: number) => void; label: string; five?: boolean }) {
  const lang = useStore((s) => s.lang);
  const W = t(lang).wz.q;
  const opts = five ? [1, 2, 3, 4, 5].map((n) => [n, String(n)] as const) : ([[2, W.low], [3, W.med], [4, W.high]] as const);
  return (
    <div className="seg small" role="radiogroup" aria-label={label}>
      {opts.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? "active" : ""} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

/** Asks the questions a project needs, one topic per step, and builds a
 *  linked project from the answers. Answers survive closing the dialog. */
export function NewProjectWizard({ open, templateId, onClose }: { open: boolean; templateId?: string; onClose: () => void }) {
  const lang = useStore((s) => s.lang);
  const addProject = useStore((s) => s.addProject);
  const T = t(lang);
  const W = T.wz;
  const ref = useRef<HTMLDialogElement>(null);
  const [a, setA] = useState<Answers>(() => initialAnswers(templateId ?? "erp", lang));
  const [step, setStep] = useState(0);
  const [resumed, setResumed] = useState(false);
  const [tried, setTried] = useState(false);
  /** Set once a project is created, so the reset that follows is not saved as a new draft. */
  const created = useRef(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      created.current = false;
      const draft = loadDraft();
      const worthResuming = draft && (draft.step > 0 || draft.a.name.trim());
      if (draft && worthResuming && (!templateId || draft.a.templateId === templateId)) { setA(draft.a); setStep(draft.step); setResumed(true); }
      else { setA(initialAnswers(templateId ?? "erp", lang)); setStep(templateId ? 1 : 0); setResumed(false); }
      setTried(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, templateId, lang]);
  useEffect(() => { if (open && !created.current) saveDraft({ a, step }); }, [a, step, open]);

  const set = (patch: Partial<Answers>) => setA((x) => ({ ...x, ...patch }));
  const setRow = <K extends "people" | "stakes" | "risks" | "milestones" | "benefits">(k: K, rowKey: string, patch: Partial<Answers[K][number]>) =>
    setA((x) => ({ ...x, [k]: (x[k] as Answers[K][number][]).map((r) => (r.key === rowKey ? { ...r, ...patch } : r)) }));
  const delRow = (k: "people" | "stakes" | "risks" | "milestones" | "benefits", rowKey: string) => setA((x) => ({ ...x, [k]: (x[k] as { key: string }[]).filter((r) => r.key !== rowKey) }));
  const pickType = (id: string) => setA((x) => ({ ...x, templateId: id, ...templateDefaults(id, lang, x.start, x.goLive) }));

  const create = () => {
    if (!a.name.trim()) { setTried(true); setStep(1); return; }
    addProject(buildProject(a, lang));
    created.current = true;
    saveDraft(null);
    setA(initialAnswers("erp", lang));
    setStep(0);
    onClose();
  };
  const canNext = step !== 1 || !!a.name.trim();
  const next = () => { if (!canNext) { setTried(true); return; } setStep(step + 1); };
  const last = W.steps.length - 1;
  const tpl = tplById(a.templateId);
  const people = a.people.filter((x) => x.name.trim() || x.role.trim());
  const stakes = a.stakes.filter((x) => x.on && x.name.trim());
  const risks = a.risks.filter((x) => x.on && x.title.trim());
  const label = (fid: string, text: string, el: ReactNode, hint?: string) => (
    <div className="field-row"><label htmlFor={fid}>{text}</label>{el}{hint && <span className="muted small">{hint}</span>}</div>
  );

  let body: ReactNode = null;
  if (step === 0) body = (
    <>
      <h2>{W.q.type}</h2><p className="muted">{W.q.typeHint}</p>
      <div className="wz-types">
        {TEMPLATES.map((x) => (
          <button key={x.id} type="button" className={"tpl" + (a.templateId === x.id ? " active" : "")} aria-pressed={a.templateId === x.id} onClick={() => pickType(x.id)}>
            <b>{x.name[lang]}</b><small>{x.desc[lang]}</small>
            <small className="wz-phases">{x.phases.map(([ph]) => ph[lang]).join(" → ")}</small>
          </button>
        ))}
      </div>
      <button type="button" className="link-btn" onClick={() => { addProject(exampleProject()); saveDraft(null); onClose(); }}>{T.exampleNote.split(".")[0]} (ERP rollout) →</button>
    </>
  );
  if (step === 1) body = (
    <>
      <h2>{W.q.basics}</h2>
      <div className="wz-grid">
        {label("wz-name", W.q.name, <input id="wz-name" className={"input" + (tried && !a.name.trim() ? " invalid" : "")} value={a.name} autoFocus onChange={(e) => set({ name: e.target.value })} aria-invalid={tried && !a.name.trim()} />, tried && !a.name.trim() ? W.q.nameRequired : undefined)}
        {label("wz-org", W.q.org, <input id="wz-org" className="input" value={a.org} onChange={(e) => set({ org: e.target.value })} />)}
      </div>
      {label("wz-purpose", W.q.purpose, <textarea id="wz-purpose" className="input" rows={3} placeholder={W.q.purposePh} value={a.purpose} onChange={(e) => set({ purpose: e.target.value })} />)}
      <div className="wz-grid four">
        {label("wz-start", W.q.start, <input id="wz-start" type="date" className="input" value={a.start} onChange={(e) => set({ start: e.target.value, milestones: gateDates(a.templateId, e.target.value, a.goLive, lang) })} />)}
        {label("wz-golive", W.q.goLive, <input id="wz-golive" type="date" className="input" value={a.goLive} onChange={(e) => set({ goLive: e.target.value, milestones: gateDates(a.templateId, a.start, e.target.value, lang) })} />)}
        {label("wz-budget", W.q.budget, <input id="wz-budget" type="number" min={0} step={1000} className="input" value={a.budget || ""} onChange={(e) => set({ budget: +e.target.value })} />, W.q.budgetHint)}
        {label("wz-cur", W.q.currency, <select id="wz-cur" className="sel" value={a.currency} onChange={(e) => set({ currency: e.target.value })}>{["DKK", "EUR", "SEK", "NOK", "USD", "GBP"].map((c) => <option key={c}>{c}</option>)}</select>)}
      </div>
    </>
  );
  if (step === 2) body = (
    <>
      <h2>{W.q.scope}</h2><p className="muted">{W.optional}</p>
      <div className="wz-grid">
        {label("wz-in", W.q.inScope, <textarea id="wz-in" className="input" rows={4} placeholder={W.q.inScopePh} value={a.inScope} onChange={(e) => set({ inScope: e.target.value })} />)}
        {label("wz-out", W.q.outScope, <textarea id="wz-out" className="input" rows={4} placeholder={W.q.outScopePh} value={a.outScope} onChange={(e) => set({ outScope: e.target.value })} />)}
      </div>
      <div className="sub-h">{W.q.success}</div><p className="muted small m0">{W.q.successHint}</p>
      {a.benefits.map((b, i) => (
        <div key={b.key} className="wz-row">
          <input className="input grow" aria-label={`${W.q.benefit} ${i + 1}`} placeholder={W.q.benefit} value={b.title} onChange={(e) => setRow("benefits", b.key, { title: e.target.value })} />
          <input className="input" aria-label={`${W.q.kpi} ${i + 1}`} placeholder={W.q.kpi} value={b.kpi} onChange={(e) => setRow("benefits", b.key, { kpi: e.target.value })} />
          <button type="button" className="icon-x" aria-label={T.del} onClick={() => delRow("benefits", b.key)}>×</button>
        </div>
      ))}
      <button type="button" className="btn ghost small self-start" onClick={() => set({ benefits: [...a.benefits, { key: key(), title: "", kpi: "" }] })}>+ {T.add}</button>
    </>
  );
  if (step === 3) body = (
    <>
      <h2>{W.q.people}</h2><p className="muted">{W.q.peopleHint}</p>
      <div className="wz-table">
        <div className="wz-head"><span>{W.q.name2}</span><span>{W.q.role}</span><span>{W.q.resp}</span><span>{W.q.group}</span><span /></div>
        {a.people.map((x, i) => (
          <div key={x.key} className="wz-line people">
            <input className="input" aria-label={`${W.q.name2} ${i + 1}`} value={x.name} onChange={(e) => setRow("people", x.key, { name: e.target.value })} autoFocus={i === 0} />
            <input className="input" aria-label={`${W.q.role} ${i + 1}`} value={x.role} onChange={(e) => setRow("people", x.key, { role: e.target.value })} />
            <input className="input" aria-label={`${W.q.resp} ${i + 1}`} value={x.resp} onChange={(e) => setRow("people", x.key, { resp: e.target.value })} />
            <select className="sel" aria-label={`${W.q.group} ${i + 1}`} value={x.group} onChange={(e) => setRow("people", x.key, { group: e.target.value })}>{P_GROUPS.map((g) => <option key={g} value={g}>{tv(lang, g)}</option>)}</select>
            <button type="button" className="icon-x" aria-label={T.del} onClick={() => delRow("people", x.key)}>×</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost small self-start" onClick={() => set({ people: [...a.people, { key: key(), name: "", role: "", resp: "", group: "Project team" }] })}>+ {W.q.addPerson}</button>
    </>
  );
  if (step === 4) body = (
    <>
      <h2>{W.q.stakes}</h2><p className="muted">{W.q.stakesHint}</p>
      <div className="wz-list">
        {a.stakes.map((x, i) => (
          <div key={x.key} className={"wz-card" + (x.on ? "" : " off")}>
            <div className="wz-row">
              <input type="checkbox" checked={x.on} aria-label={x.name || `${i + 1}`} onChange={(e) => setRow("stakes", x.key, { on: e.target.checked })} />
              <input className="input grow" aria-label={`${T.name} ${i + 1}`} value={x.name} onChange={(e) => setRow("stakes", x.key, { name: e.target.value })} />
              <select className="sel" aria-label={T.group} value={x.cat} onChange={(e) => setRow("stakes", x.key, { cat: e.target.value })}>{S_CATS.map((c) => <option key={c} value={c}>{tv(lang, c)}</option>)}</select>
              <select className="sel" aria-label={T.type} value={x.type} onChange={(e) => setRow("stakes", x.key, { type: e.target.value as "Internal" | "External" })}><option value="Internal">{T.internal}</option><option value="External">{T.external}</option></select>
            </div>
            {x.on && <div className="wz-row wz-scores"><span className="muted small">{W.q.power}</span><Level label={W.q.power} value={x.power} onChange={(v) => setRow("stakes", x.key, { power: v })} /><span className="muted small">{W.q.interest}</span><Level label={W.q.interest} value={x.interest} onChange={(v) => setRow("stakes", x.key, { interest: v })} /></div>}
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost small self-start" onClick={() => set({ stakes: [...a.stakes, { key: key(), name: "", cat: "Internal", type: "Internal", power: 3, interest: 3, on: true }] })}>+ {W.q.addStake}</button>
    </>
  );
  if (step === 5) body = (
    <>
      <h2>{W.q.risks}</h2><p className="muted">{W.q.risksHint}</p>
      <div className="wz-list">
        {a.risks.map((x, i) => (
          <div key={x.key} className={"wz-card" + (x.on ? "" : " off")}>
            <div className="wz-row">
              <input type="checkbox" checked={x.on} aria-label={x.title || `${i + 1}`} onChange={(e) => setRow("risks", x.key, { on: e.target.checked })} />
              <input className="input grow" aria-label={`${T.title} ${i + 1}`} value={x.title} onChange={(e) => setRow("risks", x.key, { title: e.target.value })} />
              <select className="sel" aria-label={T.category} value={x.cat} onChange={(e) => setRow("risks", x.key, { cat: e.target.value })}>{R_CATS.map((c) => <option key={c} value={c}>{tv(lang, c)}</option>)}</select>
            </div>
            {x.on && <>
              <div className="wz-row wz-scores">
                <span className="muted small">{W.q.prob}</span><Level five label={W.q.prob} value={x.p} onChange={(v) => setRow("risks", x.key, { p: v })} />
                <span className="muted small">{W.q.impact}</span><Level five label={W.q.impact} value={x.i} onChange={(v) => setRow("risks", x.key, { i: v })} />
                <span className={"badge sev " + (x.p * x.i >= 15 ? "high" : x.p * x.i >= 8 ? "med" : "low")}>{x.p * x.i}</span>
                <span className="muted small">{W.q.owner}</span>
                <select className="sel" aria-label={W.q.owner} value={x.owner} onChange={(e) => setRow("risks", x.key, { owner: e.target.value })}><option value="">–</option>{people.map((pp) => <option key={pp.key} value={pp.key}>{pp.name || pp.role}</option>)}</select>
              </div>
              {stakes.length > 0 && <div className="wz-row wz-affects"><span className="muted small">{W.q.affects}</span>
                <div className="pills">{stakes.map((s) => {
                  const on = x.affects.includes(s.key);
                  return <button key={s.key} type="button" className={"pill" + (on ? " on" : "")} aria-pressed={on} onClick={() => setRow("risks", x.key, { affects: on ? x.affects.filter((k) => k !== s.key) : [...x.affects, s.key] })}>{s.name}</button>;
                })}</div></div>}
              <input className="input" aria-label={`${W.q.mit} ${i + 1}`} placeholder={W.q.mit} value={x.mit} onChange={(e) => setRow("risks", x.key, { mit: e.target.value })} />
            </>}
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost small self-start" onClick={() => set({ risks: [...a.risks, { key: key(), title: "", cat: "Technical", p: 3, i: 3, owner: "", affects: [], mit: "", on: true }] })}>+ {W.q.addRisk}</button>
    </>
  );
  if (step === 6) body = (
    <>
      <h2>{W.q.plan}</h2><p className="muted">{W.q.planHint}</p>
      <div className="wz-table">
        <div className="wz-head ms"><span>{W.q.phase}</span><span>{W.q.gate}</span><span>{T.date}</span><span /></div>
        {a.milestones.map((m, i) => (
          <div key={m.key} className="wz-line ms">
            <input className="input" aria-label={`${W.q.phase} ${i + 1}`} value={m.phase} onChange={(e) => setRow("milestones", m.key, { phase: e.target.value })} />
            <input className="input" aria-label={`${W.q.gate} ${i + 1}`} value={m.title} onChange={(e) => setRow("milestones", m.key, { title: e.target.value })} />
            <input className="input" type="date" aria-label={`${T.date} ${i + 1}`} value={m.date} onChange={(e) => setRow("milestones", m.key, { date: e.target.value })} />
            <button type="button" className="icon-x" aria-label={T.del} onClick={() => delRow("milestones", m.key)}>×</button>
          </div>
        ))}
      </div>
      <div className="row-gap">
        <button type="button" className="btn ghost small" onClick={() => set({ milestones: [...a.milestones, { key: key(), phase: "", title: "", date: a.goLive }] })}>+ {W.q.addMs}</button>
        <button type="button" className="btn ghost small" onClick={() => set({ milestones: gateDates(a.templateId, a.start, a.goLive, lang) })}>{W.q.respread}</button>
      </div>
    </>
  );
  if (step === 7) body = (
    <>
      <h2>{W.q.tools}</h2><p className="muted">{W.q.toolsHint}</p>
      <div className="tool-map">
        {TOOLS.filter((x) => !ALWAYS_ON.includes(x.id)).map((x) => {
          const on = a.tools.includes(x.id);
          return (
            <label key={x.id} className={"tool-tile" + (on ? "" : " off")}>
              <span>{T.tools[x.id]}{tpl.tools.includes(x.id) && <span className="muted small"> ★</span>}</span>
              <input type="checkbox" checked={on} onChange={(e) => set({ tools: e.target.checked ? [...a.tools, x.id] : a.tools.filter((y) => y !== x.id) })} />
            </label>
          );
        })}
      </div>
    </>
  );
  if (step === 8) {
    const links = risks.reduce((n, r) => n + r.affects.filter((k) => stakes.some((s) => s.key === k)).length, 0);
    const rows: [number, string][] = [[people.length, W.summary.people], [stakes.length, W.summary.stakes], [risks.length, W.summary.risks], [links, W.summary.links], [a.milestones.length, W.summary.milestones], [a.benefits.filter((b) => b.title.trim()).length, W.summary.benefits], [a.tools.length, W.summary.tools]];
    body = (
      <>
        <h2>{W.q.review}</h2><p className="muted">{W.q.reviewHint}</p>
        <div className="wz-review card">
          <div className="id">{tpl.name[lang]}</div>
          <h3 className="wz-name">{a.name || "…"}</h3>
          {a.org && <div className="muted">{a.org}</div>}
          {a.purpose && <p>{a.purpose}</p>}
          <div className="muted small">{a.start} → {a.goLive}{a.budget ? ` · ${a.budget.toLocaleString(lang === "da" ? "da-DK" : "en-GB")} ${a.currency}` : ""}</div>
        </div>
        <div className="stats">{rows.map(([n, l], i) => <button key={l} type="button" className="stat wz-stat" onClick={() => setStep([3, 4, 5, 5, 6, 2, 7][i])}><div className="v">{n}</div><div className="l">{l}</div></button>)}</div>
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
            <li key={s}><button type="button" className={(i === step ? "active" : "") + (i < step ? " done" : "")} aria-current={i === step ? "step" : undefined} disabled={i > 1 && !a.name.trim()} onClick={() => setStep(i)}><span className="n">{i + 1}</span>{s}</button></li>
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
