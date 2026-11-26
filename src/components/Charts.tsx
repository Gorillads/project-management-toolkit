import { useState } from "react";
import type { Analysis, Lens, Project } from "../model/types";
import { useApp, useGoto } from "./ui";
import { openIssueOf, pScore, risksFor, score, sev } from "../lib/links";
import { TRIANGLE } from "../data/catalog";

export const dimName = (p: Project, kind: "S" | "R", id: string, lang: "da" | "en") =>
  (kind === "S" ? p.sDims : p.rDims).find((d) => d.id === id)?.name[lang] ?? id;

export const rScope = (p: Project, l: Lens) =>
  p.risks.filter((r) => l.cats.includes(r.cat) && (!l.sCat || r.links.some((id) => p.stakeholders.find((s) => s.id === id)?.cat === l.sCat)));

export function quadLabels(p: Project, a: Analysis, lang: "da" | "en") {
  const y = dimName(p, "S", a.y, lang), x = dimName(p, "S", a.x, lang);
  const hi = lang === "da" ? "Høj" : "High", lo = lang === "da" ? "lav" : "low", hi2 = lang === "da" ? "høj" : "high";
  return a.quads ?? { hh: `${hi} ${y}, ${hi2} ${x}`, hl: `${hi} ${y}, ${lo} ${x}`, lh: `${lang === "da" ? "Lav" : "Low"} ${y}, ${hi2} ${x}`, ll: `${lang === "da" ? "Lav" : "Low"} ${y}, ${lo} ${x}` };
}

export function StakeholderGrid({ a, mini, selected, highlight, onPick }: { a: Analysis; mini?: boolean; selected?: string; highlight?: string[]; onPick?: (id: string) => void }) {
  const { p, lang } = useApp();
  const inScope = p.stakeholders.filter((s) => a.ids.includes(s.id));
  const yN = dimName(p, "S", a.y, lang), xN = dimName(p, "S", a.x, lang);
  const item = (s: (typeof inScope)[number]) => {
    if (mini) return <div key={s.id} className="mini-name">{s.title}</div>;
    const n = risksFor(p, s.id).length;
    return (
      <button key={s.id} type="button" className={"dot-chip" + (selected === s.id || highlight?.includes(s.id) ? " selected" : "")} onClick={() => onPick?.(s.id)} title={`${s.title}: ${yN} ${s.sc[a.y]}, ${xN} ${s.sc[a.x]}`}>
        <span className="nm">{s.title}</span>{n > 0 && <span className="rc">{n}</span>}
      </button>
    );
  };
  if (a.grid === 2) {
    const lab = quadLabels(p, a, lang);
    const inQ = (yH: boolean, xH: boolean) => inScope.filter((s) => ((s.sc[a.y] ?? 0) >= 3) === yH && ((s.sc[a.x] ?? 0) >= 3) === xH);
    return (
      <div className="matrix quad-grid">
        <div className="axis-y">{yN} →</div>
        {([["hl", true, false], ["hh", true, true], ["ll", false, false], ["lh", false, true]] as const).map(([k, y, x]) => (
          <div key={k} className={"quad" + (k === "hh" ? " hot" : "")}>
            <div className="quad-title">{lab[k]}</div>
            <div className={mini ? "" : "chips"}>{inQ(y, x).map(item)}</div>
          </div>
        ))}
        <div className="axis-x">{xN} →</div>
      </div>
    );
  }
  return (
    <div className="matrix five">
      <div className="axis-y">{yN} →</div>
      {[5, 4, 3, 2, 1].map((y) => [
        <div key={"t" + y} className="tick">{y}</div>,
        ...[1, 2, 3, 4, 5].map((x) => (
          <div key={y + "-" + x} className={"cell" + (x >= 4 && y >= 4 ? " hot" : "")}>
            {inScope.filter((s) => s.sc[a.y] === y && s.sc[a.x] === x).map((s) => mini ? <span key={s.id} className="rk" title={s.title}>{s.id}</span> : item(s))}
          </div>
        )),
      ])}
      <div /><div />{[1, 2, 3, 4, 5].map((i) => <div key={"x" + i} className="tick">{i}</div>)}
      <div className="axis-x">{xN} →</div>
    </div>
  );
}

export function RiskHeat({ l, selected, onPick }: { l: Lens; selected?: string; onPick?: (id: string) => void }) {
  const { p, lang } = useApp();
  const inScope = rScope(p, l);
  const issues = p.enabled.includes("issues");
  const heat = (v: number) => (v >= 15 ? "h4" : v >= 10 ? "h3" : v >= 5 ? "h2" : "h1");
  return (
    <div className="matrix five">
      <div className="axis-y">{dimName(p, "R", l.y, lang)} →</div>
      {[5, 4, 3, 2, 1].map((y) => [
        <div key={"t" + y} className="tick">{y}</div>,
        ...[1, 2, 3, 4, 5].map((x) => (
          <div key={y + "-" + x} className={"cell " + heat(x * y)}>
            {inScope.filter((r) => r.sc[l.y] === y && r.sc[l.x] === x).map((r) => (
              <button key={r.id} type="button" className={"rk" + (issues && openIssueOf(p, r.id) ? " issue" : "") + (selected === r.id ? " selected" : "")} title={r.title} onClick={() => onPick?.(r.id)}>{r.id}</button>
            ))}
          </div>
        )),
      ])}
      <div /><div />{[1, 2, 3, 4, 5].map((i) => <div key={"x" + i} className="tick">{i}</div>)}
      <div className="axis-x">{dimName(p, "R", l.x, lang)} →</div>
    </div>
  );
}

export function Network({ cat }: { cat: string }) {
  const { p, lang } = useApp();
  const goto = useGoto();
  const issues = p.enabled.includes("issues");
  const [focus, setFocus] = useState<{ k: "s" | "r"; id: string } | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const ss = p.stakeholders.filter((s) => !cat || s.cat === cat);
  const rs = p.risks.filter((r) => r.links.some((id) => ss.some((s) => s.id === id)));
  const W = 780, row = 34, top = 30, n = Math.max(ss.length, rs.length, 1);
  const H = n * row + top + 10;
  const offS = top + ((n - ss.length) * row) / 2 + row / 2, offR = top + ((n - rs.length) * row) / 2 + row / 2;
  const xS = 250, xR = 480;
  const col = { high: "var(--danger)", med: "var(--warn)", low: "var(--ok)" };
  const lines = rs.flatMap((r, ri) => r.links.map((sid) => ({ r: r.id, s: sid, si: ss.findIndex((s) => s.id === sid), ri, c: col[sev(pScore(r))] }))).filter((l) => l.si >= 0);
  const on = (l: { r: string; s: string }) => !focus || (focus.k === "s" ? l.s === focus.id : l.r === focus.id);
  const nodeOn = (k: "s" | "r", id: string) => !focus || (focus.k === k && focus.id === id) || lines.some((l) => on(l) && (k === "s" ? l.s === id : l.r === id));
  const act = (k: "s" | "r", id: string) => { if (pinned === id) goto(id); else { setPinned(id); setFocus({ k, id }); } };
  const short = (s: string) => (s.length > 36 ? s.slice(0, 35) + "…" : s);
  return (
    <svg className="net" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 660, maxWidth: W, display: "block", marginInline: "auto" }} role="img" aria-label="Network">
      <text x={xS} y={14} textAnchor="end" fontSize={11} className="soft" letterSpacing=".06em">{lang === "da" ? "INTERESSENTER" : "STAKEHOLDERS"}</text>
      <text x={xR} y={14} fontSize={11} className="soft" letterSpacing=".06em">{lang === "da" ? `RISICI (farve = S×K${issues ? ", ⚑ = problem" : ""})` : `RISKS (colour = P×I rating${issues ? ", ⚑ = issue" : ""})`}</text>
      {lines.map((l) => {
        const y1 = offS + l.si * row, y2 = offR + l.ri * row;
        return <path key={l.r + l.s} className="net-line" style={{ opacity: focus ? (on(l) ? 1 : 0.08) : 0.55, strokeWidth: focus && on(l) ? 2.4 : 1.6 }} stroke={l.c} d={`M${xS} ${y1} C ${(xS + xR) / 2} ${y1}, ${(xS + xR) / 2} ${y2}, ${xR} ${y2}`} />;
      })}
      {ss.map((s, i) => (
        <g key={s.id} className="net-node" tabIndex={0} role="button" aria-label={s.title} style={{ opacity: nodeOn("s", s.id) ? 1 : 0.35 }}
          onMouseEnter={() => !pinned && setFocus({ k: "s", id: s.id })} onMouseLeave={() => !pinned && setFocus(null)}
          onClick={() => act("s", s.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), act("s", s.id))}>
          <text x={xS - 14} y={offS + i * row + 4} textAnchor="end" fontSize={12.5}>{s.title}</text>
          <circle cx={xS} cy={offS + i * row} r={6} fill="var(--accent)" />
        </g>
      ))}
      {rs.map((r, i) => (
        <g key={r.id} className="net-node" tabIndex={0} role="button" aria-label={r.title} style={{ opacity: nodeOn("r", r.id) ? 1 : 0.35 }}
          onMouseEnter={() => !pinned && setFocus({ k: "r", id: r.id })} onMouseLeave={() => !pinned && setFocus(null)}
          onClick={() => act("r", r.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), act("r", r.id))}>
          <rect x={xR - 6} y={offR + i * row - 6} width={12} height={12} rx={2} fill={col[sev(pScore(r))]} />
          <text x={xR + 14} y={offR + i * row + 4} fontSize={12.5}><tspan className="soft mono" fontSize={11}>{r.id}</tspan>{"  " + short(r.title)}{issues && openIssueOf(p, r.id) ? "  ⚑" : ""}</text>
        </g>
      ))}
    </svg>
  );
}

/** The project triangle: price, time and resources at the corners and
 *  quality in the middle. Each risk sits towards the sides its consequence
 *  hits (weighted by how hard), sized by probability and coloured by score. */
export function QualityTriangle({ selected, onPick }: { selected?: string; onPick?: (id: string) => void }) {
  const { p, lang, T } = useApp();
  const W = 420, H = 360;
  const C = { sched: [W / 2, 46], fin: [62, 300], res: [W - 62, 300] } as const;
  const assessed = p.risks.filter((r) => Math.max(r.sc.fin ?? 0, r.sc.sched ?? 0, r.sc.res ?? 0) > 0);
  const used = new Map<string, number>();
  const col = { high: "var(--danger)", med: "var(--warn)", low: "var(--ok)" };
  const dots = assessed.map((r) => {
    // Squared weights pull a risk clearly towards the side it hits hardest.
    const w = { fin: (r.sc.fin ?? 0) ** 2, sched: (r.sc.sched ?? 0) ** 2, res: (r.sc.res ?? 0) ** 2 };
    const sum = w.fin + w.sched + w.res;
    let x = (w.fin * C.fin[0] + w.sched * C.sched[0] + w.res * C.res[0]) / sum;
    let y = (w.fin * C.fin[1] + w.sched * C.sched[1] + w.res * C.res[1]) / sum;
    // Pull in from the corners a little, then spread risks that share a spot.
    x = W / 2 + (x - W / 2) * 0.8; y = 215 + (y - 215) * 0.8;
    const k = `${Math.round(x / 14)}:${Math.round(y / 14)}`;
    const n = used.get(k) ?? 0; used.set(k, n + 1);
    if (n) { const a = n * 2.4; x += Math.cos(a) * 20 * Math.ceil(n / 6); y += Math.sin(a) * 20 * Math.ceil(n / 6); }
    return { r, x, y, rad: 5 + (r.sc.p ?? 1) * 1.6, s: score(r, "p", "i") };
  });
  const exposure = (k: "fin" | "sched" | "res") => p.risks.reduce((a, r) => a + (r.sc.p ?? 0) * (r.sc[k] ?? 0), 0);
  const label = (k: "fin" | "sched" | "res") => TRIANGLE.find((t) => t.key === k)![lang];
  const unassessed = p.risks.filter((r) => !assessed.includes(r));
  return (
    <div className="tri-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="tri-svg" role="img" aria-label={T.tri.title}>
        <polygon points={`${C.sched.join(",")} ${C.fin.join(",")} ${C.res.join(",")}`} className="tri-shape" />
        <text x={W / 2} y={222} textAnchor="middle" className="tri-quality">{T.tri.quality.toUpperCase()}</text>
        {(["sched", "fin", "res"] as const).map((k) => {
          const [x, y] = C[k];
          const ty = k === "sched" ? y - 18 : y + 30;
          return (
            <g key={k}>
              <text x={x} y={ty} textAnchor="middle" className="tri-corner">{label(k)}</text>
              <text x={x} y={ty + 15} textAnchor="middle" className="tri-exp"><title>{T.tri.exposureHint}</title>{T.tri.exposure} {exposure(k)}</text>
            </g>
          );
        })}
        {dots.map(({ r, x, y, rad, s }) => (
          <g key={r.id} className={"tri-dot" + (selected === r.id ? " selected" : "")} onClick={() => onPick?.(r.id)} role="button" tabIndex={0} aria-label={`${r.id} ${r.title}`}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick?.(r.id); } }}>
            <title>{`${r.id} ${r.title}\n${label("fin")} ${r.sc.fin ?? 0} · ${label("sched")} ${r.sc.sched ?? 0} · ${label("res")} ${r.sc.res ?? 0}`}</title>
            <circle cx={x} cy={y} r={rad} fill={col[sev(s)]} />
            <text x={x + rad + 3} y={y + 4} className="tri-id">{r.id}</text>
          </g>
        ))}
      </svg>
      {unassessed.length > 0 && (
        <div className="tri-unassessed"><span className="muted small">{T.tri.notAssessed}:</span>
          {unassessed.map((r) => <button key={r.id} type="button" className={"rk" + (selected === r.id ? " selected" : "")} onClick={() => onPick?.(r.id)} title={r.title}>{r.id}</button>)}
        </div>
      )}
    </div>
  );
}
