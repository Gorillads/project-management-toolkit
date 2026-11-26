import type { AnyItem, CollKey, Lang, Project } from "../model/types";
import { t, tv } from "../i18n";
import { tplById } from "../data/templates";
import { repairProject } from "../state/store";
import { syncCats } from "./categories";
import { COLLS, openIssueOf, peopleFor, pScore, risksFor, score, sev, titleOf } from "./links";

export function downloadBlob(data: Blob | string, filename: string, type = "text/plain") {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  // A non-bubbling click, so open menus do not read it as a click outside.
  document.body.appendChild(a); a.dispatchEvent(new MouseEvent("click")); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------- JSON ---------------- */
export const projectJson = (p: Project) => JSON.stringify({ format: "project-management-toolkit", version: 1, exportedAt: new Date().toISOString(), project: p }, null, 2);
export function parseProjectJson(text: string): Project {
  const data = JSON.parse(text);
  const p = (data.project ?? data) as Project;
  if (!p || !Array.isArray(p.stakeholders) || !Array.isArray(p.risks)) throw new Error("Not a project file");
  return repairProject(p);
}

/* ---------------- CSV ----------------
 * One semicolon-separated file with a BOM (opens cleanly in Excel with
 * Danish characters), one row per item. Generic columns are mapped to each
 * register's own fields by CSV_MAP, so the same file reads back in. */
const COLS = ["Register", "ID", "Title", "Category", "Type", "Owner", "Status", "Date", "Number", "Text", "Notes", "Scores", "Links", "Serves"] as const;
type Col = (typeof COLS)[number];
const CSV_MAP: Record<string, Partial<Record<Col, string>>> = {
  stakeholders: { Category: "cat", Type: "type", Owner: "org", Text: "need" },
  people: { Category: "group", Type: "role", Owner: "stakeholder", Status: "org", Text: "resp", Date: "email" },
  risks: { Category: "cat", Owner: "owner", Status: "status", Text: "mit" },
  issues: { Category: "prio", Type: "from", Owner: "owner", Status: "status" },
  decisions: { Category: "tpl", Owner: "by", Date: "date" },
  assumptions: { Type: "kind", Status: "status" },
  changes: { Owner: "by", Status: "status", Number: "cost", Type: "weeks" },
  milestones: { Date: "date", Status: "done" },
  tasks: { Status: "col", Owner: "owner" },
  benefits: { Category: "kpi", Owner: "owner" },
  lessons: { Category: "source" },
  wbs: { Category: "code", Owner: "owner", Date: "start", Type: "end", Number: "progress" },
  goals: { Type: "parent" },
  criteria: { Type: "parent", Category: "target", Owner: "owner", Status: "status" },
  deliverables: { Type: "parent", Owner: "owner", Date: "due", Status: "status" },
};
const NUMERIC = new Set(["cost", "weeks", "progress"]);

const cell = (v: unknown) => { const s = String(v ?? ""); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const toCsv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");

export function projectCsv(p: Project): string {
  const rows: unknown[][] = [[...COLS]];
  for (const c of COLLS) {
    const m = CSV_MAP[c];
    for (const it of p[c] as AnyItem[]) {
      const r = it as unknown as Record<string, unknown>;
      const row: Record<Col, unknown> = { Register: c, ID: it.id, Title: it.title, Category: "", Type: "", Owner: "", Status: "", Date: "", Number: "", Text: "", Notes: it.notes ?? "", Scores: "", Links: it.links.join(" "), Serves: Array.isArray(r.serves) ? (r.serves as string[]).join(" ") : "" };
      for (const [col, k] of Object.entries(m)) row[col as Col] = c === "milestones" && k === "done" ? (r.done ? "Done" : "Planned") : r[k as string] ?? "";
      if ("sc" in r) row.Scores = Object.entries(r.sc as Record<string, number>).map(([k, v]) => `${k}=${v}`).join(", ");
      rows.push(COLS.map((k) => row[k]));
    }
  }
  rows.push(["purpose", "PURPOSE", p.charter.purpose, "", "", "", "", "", "", "", "", "", "", ""]);
  for (const b of p.budget) rows.push(["budget", b.id, b.area, b.act, b.fc, b.fileId ?? "", "", "", b.plan, b.range ?? "", "", "", b.links.join(" "), ""]);
  return toCsv(rows);
}

export function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let f = ""; let q = false;
  const s = text.replace(/^﻿/, "");
  const delim = (s.split("\n")[0].match(/;/g)?.length ?? 0) >= (s.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && s[i + 1] === "\n") i++; row.push(f); f = ""; if (row.some((x) => x !== "")) out.push(row); row = []; }
    else f += ch;
  }
  row.push(f); if (row.some((x) => x !== "")) out.push(row);
  return out;
}

/** Read a CSV made by projectCsv (or edited in Excel) back into the
 *  project. Each register present in the file replaces that register;
 *  fields the CSV does not carry are kept from the item with the same ID. */
export function importCsv(p: Project, text: string): { registers: string[]; rows: number } {
  const rows = parseCsv(text);
  const head = rows.shift()?.map((h) => h.trim()) ?? [];
  const ix = (c: Col) => head.indexOf(c);
  if (ix("Register") < 0 || ix("ID") < 0) throw new Error("Missing Register/ID columns");
  const by: Record<string, string[][]> = {};
  for (const r of rows) (by[r[ix("Register")]?.trim()] ??= []).push(r);
  const get = (r: string[], c: Col) => (ix(c) >= 0 ? (r[ix(c)] ?? "").trim() : "");
  let n = 0;
  for (const [reg, rs] of Object.entries(by)) {
    if (reg === "purpose") { const t = get(rs[0], "Title"); if (t) p.charter.purpose = t; n++; continue; }
    if (reg === "budget") {
      p.budget = rs.map((r) => ({ id: get(r, "ID"), area: get(r, "Title"), plan: +get(r, "Number") || 0, act: +get(r, "Category") || 0, fc: +get(r, "Type") || 0, fileId: get(r, "Owner") || undefined, range: get(r, "Text") || undefined, links: get(r, "Links").split(/\s+/).filter(Boolean) }));
      n += rs.length; continue;
    }
    if (!(reg in CSV_MAP)) continue;
    const c = reg as CollKey;
    const old = new Map((p[c] as AnyItem[]).map((x) => [x.id, x]));
    (p[c] as AnyItem[]) = rs.map((r) => {
      const id = get(r, "ID");
      const it = structuredClone(old.get(id) ?? { id, title: "", links: [] }) as unknown as Record<string, unknown>;
      it.id = id; it.title = get(r, "Title");
      it.links = get(r, "Links").split(/\s+/).filter(Boolean);
      if (c === "criteria" || c === "deliverables") it.serves = get(r, "Serves").split(/\s+/).filter(Boolean);
      const notes = get(r, "Notes"); if (notes) it.notes = notes; else delete it.notes;
      for (const [col, k] of Object.entries(CSV_MAP[c])) {
        const v = get(r, col as Col);
        if (c === "milestones" && k === "done") it.done = /^(done|færdig|true|1|yes|ja)$/i.test(v);
        else if (NUMERIC.has(k as string)) it[k as string] = +v || 0;
        else if (v) it[k as string] = v; else delete it[k as string];
      }
      const sc = get(r, "Scores");
      if (sc || c === "stakeholders" || c === "risks") {
        const base = (it.sc as Record<string, number>) ?? {};
        for (const pair of sc.split(",")) { const [k, v] = pair.split("=").map((x) => x.trim()); if (k && v) base[k] = Math.max(1, Math.min(5, +v || 1)); }
        const dims = c === "stakeholders" ? p.sDims : p.rDims;
        for (const d of dims) base[d.id] ??= 3;
        it.sc = base;
      }
      if (c === "stakeholders") { it.type = it.type === "Internal" ? "Internal" : "External"; it.cat ??= ""; it.org ??= ""; it.need ??= ""; }
      if (c === "risks") { it.cat ??= ""; it.status ??= "Open"; it.mit ??= ""; }
      if (c === "criteria") { it.target ??= ""; it.status ??= "Not measured"; }
      if (c === "deliverables") it.status ??= "Not started";
      if (c === "tasks") it.col = ["todo", "doing", "done"].includes(it.col as string) ? it.col : "todo";
      return it as unknown as AnyItem;
    });
    n += rs.length;
  }
  syncCats(p);
  return { registers: Object.keys(by), rows: n };
}

export function budgetCsv(p: Project) {
  return toCsv([["Area", "Plan", "Spent", "Forecast", "Source file", "Range", "Links"], ...p.budget.map((b) => [b.area, b.plan, b.act, b.fc, p.files.find((f) => f.id === b.fileId)?.name ?? "", b.range ?? "", b.links.join(" ")])]);
}

/* ---------------- PowerPoint ---------------- */
export async function buildDeck(p: Project, lang: Lang): Promise<Blob> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const T = t(lang);
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE"; pres.title = p.name;
  const C = { acc: "416180", txt: "1C2430", soft: "5A6472", bd: "DDE1E6", bg: "F5F6F8", wash: "E8EEF4", red: "A3402F", redw: "F6E4E0", amb: "9A6A12", ambw: "F6EDD9", grn: "3D7A4F", grnw: "E2EFE5" };
  const F = "Calibri";
  const tpl = tplById(p.templateId);
  const fmt = (n: number) => n.toLocaleString(lang === "da" ? "da-DK" : "en-GB");
  const tot = (k: "plan" | "act" | "fc") => p.budget.reduce((a, b) => a + b[k], 0);
  const base = (title: string, sub?: string) => {
    const s = pres.addSlide(); s.background = { color: "FFFFFF" };
    s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: C.acc }, line: { color: C.acc } });
    s.addText(title, { x: 0.5, y: 0.35, w: 12.3, h: 0.6, fontFace: F, fontSize: 26, bold: true, color: C.txt });
    if (sub) s.addText(sub, { x: 0.5, y: 0.92, w: 12.3, h: 0.4, fontFace: F, fontSize: 13, color: C.soft });
    s.addText(`${p.name}${p.org ? " · " + p.org : ""}`, { x: 0.5, y: 7.05, w: 8, h: 0.3, fontFace: F, fontSize: 9, color: C.soft });
    return s;
  };
  const th = (x: string) => ({ text: x, options: { bold: true, color: C.soft, fill: { color: C.bg }, fontSize: 10 } });
  const tbl = { fontFace: F, fontSize: 10.5, color: C.txt, border: { type: "solid" as const, pt: 0.5, color: C.bd }, valign: "middle" as const, margin: 0.05 };
  const sevC = (s: number) => (s >= 15 ? [C.redw, C.red] : s >= 8 ? [C.ambw, C.amb] : [C.grnw, C.grn]);
  const highRisks = p.risks.filter((r) => sev(pScore(r)) === "high");
  const openIssues = p.issues.filter((i) => i.status !== "Closed");

  let s = pres.addSlide(); s.background = { color: C.acc };
  s.addText(p.name, { x: 0.8, y: 2.4, w: 11.5, h: 1, fontFace: F, fontSize: 44, bold: true, color: "FFFFFF" });
  s.addText(`${p.org ? p.org + " · " : ""}${tpl.name[lang]} · ${new Date().toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}`, { x: 0.8, y: 3.4, w: 11.5, h: 0.5, fontFace: F, fontSize: 16, color: "E8EEF4" });

  s = base(lang === "da" ? "Casen i overblik" : "The case at a glance", p.charter.purpose ? `${T.purpose}: ${p.charter.purpose}` : undefined);
  const kpis: [string, string][] = [[String(p.stakeholders.length), T.statStakeholders], [String(p.risks.length), `${T.statRisks}, ${highRisks.length} ${T.statHigh}`], [String(openIssues.length), T.statIssues], [fmt(tot("fc")) + "k", `${p.currency} ${T.forecast.toLowerCase()}`], [p.charter.goLive || "–", T.goLive]];
  kpis.forEach(([v, l], i) => { const x = 0.5 + i * 2.5; s.addShape(pres.ShapeType.rect, { x, y: 1.6, w: 2.3, h: 1.3, fill: { color: C.bg }, line: { color: C.bd } }); s.addText(v, { x: x + 0.15, y: 1.7, w: 2, h: 0.6, fontFace: F, fontSize: 24, bold: true, color: C.txt }); s.addText(l, { x: x + 0.15, y: 2.3, w: 2, h: 0.5, fontFace: F, fontSize: 11, color: C.soft }); });
  tpl.phases.forEach(([n, g], i) => { const x = 0.5 + i * 2.5; const done = i < p.phase, cur = i === p.phase; s.addShape(pres.ShapeType.chevron, { x, y: 3.4, w: 2.4, h: 0.6, fill: { color: done || cur ? C.acc : C.wash }, line: { color: done || cur ? C.acc : C.wash } }); s.addText(n[lang], { x: x + 0.2, y: 3.4, w: 2, h: 0.6, fontFace: F, fontSize: 12, bold: true, color: done || cur ? "FFFFFF" : C.acc, align: "center" }); s.addText("◆ " + g[lang], { x, y: 4.05, w: 2.4, h: 0.5, fontFace: F, fontSize: 10, color: C.soft, align: "center" }); });
  s.addText([{ text: T.tools.benefits, options: { bold: true, breakLine: true } }, ...p.benefits.map((b) => ({ text: b.title, options: { bullet: true, breakLine: true } }))], { x: 0.5, y: 4.8, w: 6, h: 2, fontFace: F, fontSize: 12, color: C.txt, valign: "top" });
  s.addText([{ text: `${T.tools.risks}: ${T.high}`, options: { bold: true, breakLine: true } }, ...highRisks.map((r) => ({ text: `${r.id} ${r.title}`, options: { bullet: true, breakLine: true } }))], { x: 6.9, y: 4.8, w: 6, h: 2, fontFace: F, fontSize: 12, color: C.txt, valign: "top" });

  // the why/how hierarchy
  if (p.goals.length || p.criteria.length || p.deliverables.length) {
    s = base(T.tools.purpose, p.charter.purpose || undefined);
    const col = (title: string, rows: { id: string; title: string; serves?: string[]; parent?: string; extra?: string }[], x: number) => {
      const r: unknown[][] = [[th(title)]];
      rows.forEach((it) => r.push([{ text: [
        { text: `${it.id}  `, options: { color: C.soft, fontSize: 9 } },
        { text: it.title, options: { bold: true, breakLine: true } },
        { text: [it.parent ? `${T.pu.under} ${it.parent}` : "", it.serves?.length ? `→ ${it.serves.map((x) => (x === "PURPOSE" ? T.pu.purpose : x)).join(", ")}` : "", it.extra ?? ""].filter(Boolean).join(" · "), options: { color: C.soft, fontSize: 9 } },
      ] }]));
      // @ts-expect-error see above
      s.addTable(r, { ...tbl, x, y: 1.5, w: 4, fontSize: 10.5, valign: "top" });
    };
    col(T.pu.goals, p.goals.map((g) => ({ id: g.id, title: g.title, parent: g.parent })), 0.5);
    col(T.pu.criteria, p.criteria.map((c) => ({ id: c.id, title: c.title, parent: c.parent, serves: c.serves, extra: [c.target, tv(lang, c.status)].filter(Boolean).join(" · ") })), 4.67);
    col(T.pu.deliverables, p.deliverables.map((d) => ({ id: d.id, title: d.title, parent: d.parent, serves: d.serves, extra: [titleOf(p, d.owner), d.due, tv(lang, d.status)].filter(Boolean).join(" · ") })), 8.83);
  }

  s = base(T.stakeholdersWord, `${p.stakeholders.filter((x) => x.type === "Internal").length} ${T.internal.toLowerCase()} · ${p.stakeholders.filter((x) => x.type === "External").length} ${T.external.toLowerCase()}`);
  (["Internal", "External"] as const).forEach((ty, k) => {
    const rows: unknown[][] = [[th(ty === "Internal" ? T.internal : T.external), th(T.group), th(T.contacts), th(T.risksCol)]];
    p.stakeholders.filter((x) => x.type === ty).forEach((x) => rows.push([x.title, tv(lang, x.cat), peopleFor(p, x.id).map((q) => q.title).join(", "), String(risksFor(p, x.id).length)]));
    // @ts-expect-error pptxgenjs row typing is looser than its .d.ts
    s.addTable(rows, { ...tbl, x: 0.5 + k * 6.3, y: 1.5, w: 6, colW: [2.4, 1.4, 1.6, 0.6], fontSize: 9.5 });
  });

  for (const a of p.analyses.filter((x) => x.pinned && x.grid === 2)) {
    const yN = p.sDims.find((d) => d.id === a.y)?.name[lang] ?? a.y, xN = p.sDims.find((d) => d.id === a.x)?.name[lang] ?? a.x;
    s = base(a.name, `${yN} ↑ · ${xN} →`);
    const lab = a.quads ?? { hh: "", hl: "", lh: "", ll: "" };
    ([["hl", 1, 0, 0, 0], ["hh", 1, 1, 1, 0], ["ll", 0, 0, 0, 1], ["lh", 0, 1, 1, 1]] as const).forEach(([k, yH, xH, cx, cy]) => {
      const x = 1.2 + cx * 5.9, y = 1.5 + cy * 2.75;
      const names = p.stakeholders.filter((z) => a.ids.includes(z.id) && ((z.sc[a.y] ?? 0) >= 3) === !!yH && ((z.sc[a.x] ?? 0) >= 3) === !!xH).map((z) => z.title);
      s.addShape(pres.ShapeType.rect, { x, y, w: 5.7, h: 2.6, fill: { color: k === "hh" ? C.wash : C.bg }, line: { color: C.bd } });
      s.addText([{ text: (lab[k] || k).toUpperCase(), options: { bold: true, color: C.soft, fontSize: 10, breakLine: true } }, ...names.map((n) => ({ text: n, options: { breakLine: true } }))], { x: x + 0.15, y: y + 0.1, w: 5.4, h: 2.4, fontFace: F, fontSize: 12, color: C.txt, valign: "top" });
    });
    s.addText(xN + " →", { x: 1.2, y: 6.9, w: 11.6, h: 0.3, fontFace: F, fontSize: 11, color: C.soft, align: "center" });
  }

  for (const l of p.lenses.filter((x) => x.pinned)) {
    const yN = p.rDims.find((d) => d.id === l.y)?.name[lang] ?? l.y, xN = p.rDims.find((d) => d.id === l.x)?.name[lang] ?? l.x;
    s = base(`${T.tools.risks} · ${l.name}`, `${yN} × ${xN}. ⚑ = ${T.issueFlag.toLowerCase()}`);
    const rs = p.risks.filter((r) => l.cats.includes(r.cat) && (!l.sCat || r.links.some((id) => p.stakeholders.find((z) => z.id === id)?.cat === l.sCat)));
    const rows: unknown[][] = [];
    for (let y = 5; y >= 1; y--) {
      const row: unknown[] = [{ text: String(y), options: { bold: true, color: C.soft, align: "center" } }];
      for (let x = 1; x <= 5; x++) { const v = x * y; row.push({ text: rs.filter((r) => r.sc[l.y] === y && r.sc[l.x] === x).map((r) => r.id + (openIssueOf(p, r.id) ? "⚑" : "")).join(" "), options: { fill: { color: v >= 15 ? "EFC9BF" : v >= 10 ? "F2DCC8" : v >= 5 ? "EFE9D2" : "E3ECE6" }, align: "center", fontSize: 10 } }); }
      rows.push(row);
    }
    rows.push([{ text: "" }, ...[1, 2, 3, 4, 5].map((n) => ({ text: String(n), options: { bold: true, color: C.soft, align: "center" } }))]);
    // @ts-expect-error see above
    s.addTable(rows, { ...tbl, x: 0.5, y: 1.5, w: 5.6, colW: [0.4, 1.04, 1.04, 1.04, 1.04, 1.04], rowH: 0.8 });
    const top: unknown[][] = [[th(T.id), th(T.title), th("Score"), th(T.owner)]];
    [...rs].sort((a, b) => score(b, l.x, l.y) - score(a, l.x, l.y)).slice(0, 9).forEach((r) => { const v = score(r, l.x, l.y); const [bg, fg] = sevC(v); top.push([r.id + (openIssueOf(p, r.id) ? " ⚑" : ""), r.title, { text: String(v), options: { fill: { color: bg }, color: fg, bold: true, align: "center" } }, titleOf(p, r.owner)]); });
    // @ts-expect-error see above
    s.addTable(top, { ...tbl, x: 6.5, y: 1.5, w: 6.3, colW: [0.6, 3.4, 0.7, 1.6], fontSize: 10 });
  }

  s = base(`${T.tools.issues} · ${T.tools.decisions}`);
  const it: unknown[][] = [[th(T.id), th(T.title), th(T.fromRisk), th(T.status)]];
  openIssues.forEach((i) => it.push([i.id, i.title, i.from ?? "", tv(lang, i.status)]));
  // @ts-expect-error see above
  s.addTable(it, { ...tbl, x: 0.5, y: 1.5, w: 6.1, colW: [0.5, 3.6, 0.7, 1.3] });
  const dt: unknown[][] = [[th(T.id), th(T.title), th(T.date), th(T.decidedBy)]];
  p.decisions.forEach((x) => dt.push([x.id, x.title, x.date, titleOf(p, x.by)]));
  // @ts-expect-error see above
  s.addTable(dt, { ...tbl, x: 6.8, y: 1.5, w: 6, colW: [0.5, 3.2, 1.1, 1.2] });

  s = base(T.tools.schedule);
  const mt: unknown[][] = [[th(T.id), th(T.title), th(T.date), th(T.status), th(T.tools.risks)]];
  [...p.milestones].sort((a, b) => a.date.localeCompare(b.date)).forEach((m) => { const risky = m.links.some((id) => { const r = p.risks.find((x) => x.id === id); return r && sev(pScore(r)) === "high"; }); mt.push([m.id, m.title, m.date, { text: m.done ? T.done : risky ? T.atRisk : "–", options: { color: m.done ? C.grn : risky ? C.red : C.txt, bold: risky } }, m.links.filter((x) => x.startsWith("R")).join(", ")]); });
  // @ts-expect-error see above
  s.addTable(mt, { ...tbl, x: 0.5, y: 1.5, w: 12.3, colW: [0.7, 4.2, 1.6, 1.4, 4.4] });

  if (p.budget.length) {
    s = base(T.tools.budget, `k ${p.currency}. ${T.plan} ${fmt(tot("plan"))} · ${T.spent} ${fmt(tot("act"))} · ${T.forecast} ${fmt(tot("fc"))}`);
    const labels = p.budget.map((b) => b.area);
    s.addChart(pres.ChartType.bar, [{ name: T.plan, labels, values: p.budget.map((b) => b.plan) }, { name: T.spent, labels, values: p.budget.map((b) => b.act) }, { name: T.forecast, labels, values: p.budget.map((b) => b.fc) }],
      { x: 0.5, y: 1.5, w: 7.4, h: 5.3, barDir: "bar", barGrouping: "clustered", chartColors: ["9AA4B2", C.acc, C.red], showLegend: true, legendPos: "b", catAxisLabelFontSize: 10, valAxisLabelFontSize: 9 });
    const ft: unknown[][] = [[th(T.sourceFile), th(T.synced)]];
    p.files.forEach((f) => ft.push([f.name, f.synced]));
    // @ts-expect-error see above
    s.addTable(ft, { ...tbl, x: 8.3, y: 1.5, w: 4.5, colW: [3, 1.5], fontSize: 10 });
  }

  if (p.people.length) {
    s = base(T.tools.people);
    const groups = [...p.pGroups, ...(p.people.some((x) => !x.group || !p.pGroups.includes(x.group)) ? [""] : [])];
    const half = Math.ceil(groups.length / 2);
    [groups.slice(0, half), groups.slice(half)].forEach((gs, k) => {
      const rows: unknown[][] = [[th(T.name), th(T.role), th(T.resp)]];
      gs.forEach((g) => { const ms = g ? p.people.filter((x) => x.group === g) : p.people.filter((x) => !x.group || !p.pGroups.includes(x.group)); if (!ms.length) return; rows.push([{ text: g ? tv(lang, g) : T.noGroup, options: { bold: true, colspan: 3, fill: { color: C.wash }, color: C.acc } }]); ms.forEach((x) => rows.push([x.title, x.role, x.resp])); });
      // @ts-expect-error see above
      if (rows.length > 1) s.addTable(rows, { ...tbl, x: 0.5 + k * 6.3, y: 1.5, w: 6, colW: [1.5, 1.6, 2.9], fontSize: 9 });
    });
  }
  return (await pres.write({ outputType: "blob" })) as Blob;
}

/** "1.200,50", "1,200.50", "1 200" and "-300" all become numbers. */
export function parseNum(s: string): number {
  let v = s.replace(/[\s ]|kr\.?|dkk|eur|€|\$/gi, "");
  const lc = v.lastIndexOf(","), ld = v.lastIndexOf(".");
  if (lc > -1 && ld > -1) v = lc > ld ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
  else if (lc > -1) v = /,\d{1,2}$/.test(v) ? v.replace(",", ".") : v.replace(/,/g, "");
  else if (ld > -1 && /\.\d{3}($|\.)/.test(v)) v = v.replace(/\./g, "");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Read Plan / Spent / Forecast per area from a spreadsheet exported as
 *  CSV, and update the budget lines whose area matches (new areas are
 *  added). Returns how many lines changed, or -1 when no columns match. */
export function readBudgetCsv(p: Project, text: string, fileId: string, range: string): number {
  const rows = parseCsv(text);
  const head = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  const find = (re: RegExp) => head.findIndex((h) => re.test(h));
  const ia = find(/^(area|område|omrade|post|item|category|kategori|konto|account|line)/);
  const ip = find(/^(plan|planned|budget)/), is = find(/^(spent|actual|forbrug|faktisk)/), ifc = find(/^(forecast|prognose|estimate|skøn)/);
  if (ia < 0 || (ip < 0 && is < 0 && ifc < 0)) return -1;
  let n = 0;
  for (const r of rows) {
    const area = (r[ia] ?? "").trim();
    if (!area || /^(total|i alt|sum)$/i.test(area)) continue;
    let line = p.budget.find((b) => b.area.trim().toLowerCase() === area.toLowerCase());
    if (!line) { line = { id: "BU" + Date.now().toString(36) + n, area, plan: 0, act: 0, fc: 0, links: [] }; p.budget.push(line); }
    if (ip >= 0) line.plan = parseNum(r[ip] ?? "");
    if (is >= 0) line.act = parseNum(r[is] ?? "");
    if (ifc >= 0) line.fc = parseNum(r[ifc] ?? "");
    else if (ip >= 0 && !line.fc) line.fc = line.plan;
    line.fileId = fileId; line.range = range;
    n++;
  }
  return n;
}
