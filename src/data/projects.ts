import type { Analysis, Lang, Lens, Project, Risk, Stakeholder } from "../model/types";
import { DEFAULT_R_DIMS, DEFAULT_S_DIMS, DEFAULT_TOOLS, L } from "./catalog";
import { tplById } from "./templates";

export const S_CATS = ["Internal", "Investors", "Customers", "Partners", "Authorities & reps"];
export const R_CATS = ["Technical", "Organisational", "Commercial", "Financial", "External"];
export const P_GROUPS = ["Project team", "Steering committee"];

let seq = 0;
export const uid = (p: string) => `${p}${Date.now().toString(36)}${(++seq).toString(36)}`;

export function defaultAnalyses(st: Stakeholder[], lang: Lang): Analysis[] {
  const ids = (cats?: string[]) => st.filter((s) => !cats || cats.includes(s.cat)).map((s) => s.id);
  const da = lang === "da";
  return [
    { id: "pi", name: da ? "Magt / interesse" : "Power / Interest", scope: da ? "Alle interessenter" : "All stakeholders", ids: ids(), x: "interest", y: "power", grid: 2, pinned: true,
      quads: da ? { hh: "Involvér tæt", hl: "Hold tilfreds", lh: "Hold informeret", ll: "Overvåg" } : { hh: "Manage closely", hl: "Keep satisfied", lh: "Keep informed", ll: "Monitor" } },
    { id: "inv", name: da ? "Investoranalyse" : "Investor analysis", scope: da ? "Kun investorer" : "Investors only", ids: ids(["Investors"]), x: "invest", y: "influence", grid: 2, pinned: true,
      quads: da ? { hh: "Kerneejere", hl: "Indflydelsesrig, lille andel", lh: "Stor andel, passiv", ll: "Mindre ejere" } : { hh: "Core owners", hl: "Influential, small stake", lh: "Large stake, passive", ll: "Minor holders" } },
    { id: "cust", name: da ? "Kundesegmenter" : "Customer segments", scope: da ? "Kun kunder" : "Customers only", ids: ids(["Customers"]), x: "revenue", y: "churn", grid: 2,
      quads: da ? { hh: "Beskyt for enhver pris", hl: "Let at miste, lav værdi", lh: "Værdifulde og loyale", ll: "Standardservice" } : { hh: "Protect at all cost", hl: "Easy to lose, low value", lh: "Valuable and loyal", ll: "Standard service" } },
    { id: "chg", name: da ? "Forandringsparathed" : "Change readiness", scope: da ? "Kun interne" : "Internal only", ids: ids(["Internal"]), x: "affected", y: "support", grid: 2,
      quads: da ? { hh: "Ambassadører", hl: "Allierede", lh: "Modstandere at vinde", ll: "Tilskuere" } : { hh: "Champions", hl: "Allies", lh: "Resisters to win over", ll: "Bystanders" } },
    { id: "sal", name: da ? "Salience" : "Salience", scope: da ? "Alle interessenter" : "All stakeholders", ids: ids(), x: "urgency", y: "legit", grid: 5 },
  ];
}
export function defaultLenses(lang: Lang): Lens[] {
  const da = lang === "da";
  return [
    { id: "pxi", name: da ? "Sandsynlighed × konsekvens" : "Probability × Impact", x: "i", y: "p", cats: [...R_CATS], sCat: "", pinned: true },
    { id: "fin", name: da ? "Økonomisk eksponering" : "Financial exposure", x: "fin", y: "p", cats: [...R_CATS], sCat: "", pinned: true },
    { id: "soon", name: da ? "Det der rammer snart" : "What hits soon", x: "i", y: "prox", cats: [...R_CATS], sCat: "" },
    { id: "blind", name: da ? "Blinde vinkler" : "Blind spots", x: "i", y: "detect", cats: [...R_CATS], sCat: "" },
    { id: "invr", name: da ? "Risici der rører investorer" : "Risks touching investors", x: "fin", y: "p", cats: [...R_CATS], sCat: "Investors" },
  ];
}
const scoreAll = (dims: { id: string }[], v = 3) => Object.fromEntries(dims.map((d) => [d.id, v]));

/** A new, nearly empty project, pre-filled with a template's typical
 *  stakeholders and risks so the analyses have something to show. */
export function projectFromTemplate(templateId: string, lang: Lang, name?: string): Project {
  const tpl = tplById(templateId);
  const stakeholders: Stakeholder[] = tpl.groups.map(([n, cat, type], i) => ({
    id: `S${i + 1}`, title: n[lang], cat, type, org: "", need: "", links: [], sc: scoreAll(DEFAULT_S_DIMS),
  }));
  const risks: Risk[] = tpl.risks.map(([n, cat, cause, [fin, sched, res]], i) => ({
    id: `R${i + 1}`, title: n[lang], cat, cause: cause[lang], consequence: "", mit: "", status: "Open", links: [], sc: { ...scoreAll(DEFAULT_R_DIMS), fin, sched, res },
  }));
  return {
    id: uid("prj"),
    name: name ?? (lang === "da" ? "Nyt projekt" : "New project"),
    org: "",
    templateId: tpl.id,
    phase: 0,
    currency: "DKK",
    charter: { purpose: "", inScope: "", outScope: "", budgetNote: "", goLive: "", links: [] },
    stakeholders, people: [], risks, issues: [], decisions: [], assumptions: [], changes: [], milestones: [], tasks: [], benefits: [], lessons: [], wbs: [],
    goals: [], criteria: [], deliverables: [],
    budget: [], files: [], raci: [], raciPeople: [], swot: { s: [], w: [], o: [], t: [] },
    sDims: [...DEFAULT_S_DIMS], rDims: [...DEFAULT_R_DIMS], sCats: [...S_CATS], rCats: [...R_CATS], pGroups: [...P_GROUPS],
    analyses: defaultAnalyses(stakeholders, lang), lenses: defaultLenses(lang),
    enabled: [...DEFAULT_TOOLS],
  };
}

const sd = (a: number[]) => Object.fromEntries(DEFAULT_S_DIMS.map((d, i) => [d.id, a[i]]));
const rd = (a: number[]) => Object.fromEntries(DEFAULT_R_DIMS.map((d, i) => [d.id, a[i]]));

/** The worked example: an ERP rollout at a fictional trading company. */
export function exampleProject(): Project {
  const S: Stakeholder[] = ([
    ["S1", "CFO / project sponsor", "Internal", "Internal", "Executive board", "Go-live before fiscal year end, budget held", [5, 4, 1, 5, 5, 3, 4, 5, 5, 1, 1, 3], 4, 4],
    ["S2", "IT Operations", "Internal", "Internal", "Internal IT", "Stable integrations, clear handover to support", [4, 5, 1, 4, 3, 5, 4, 4, 3, 1, 1, 5], 2, 3],
    ["S3", "Finance key users", "Internal", "Internal", "Finance dept.", "Training before month-end close", [3, 5, 1, 3, 2, 5, 4, 4, 4, 1, 1, 4], 3, 4],
    ["S4", "Warehouse staff", "Internal", "Internal", "Logistics", "Scanner workflow no slower than today", [2, 4, 1, 2, 1, 5, 3, 4, 1, 1, 1, 3], 1, 3],
    ["S5", "Sales team", "Internal", "Internal", "Sales", "Correct prices and stock in the new system", [2, 3, 1, 2, 1, 3, 2, 3, 3, 1, 1, 2], 2, 3],
    ["S6", "Pension fund (majority owner)", "Investors", "External", "Owner, 58%", "Return on the 5.9M DKK programme", [5, 2, 5, 4, 4, 2, 2, 5, 3, 1, 1, 1], 2, 3],
    ["S7", "Founding family", "Investors", "External", "Owner, 30%", "Company culture kept, no layoffs", [4, 4, 4, 3, 4, 3, 2, 5, 4, 1, 1, 2], 3, 3],
    ["S8", "Bank (credit facility)", "Investors", "External", "Lender", "Covenants met through the switch-over", [3, 2, 4, 2, 2, 1, 3, 4, 3, 1, 1, 1], 2, 3],
    ["S9", "Venture fund (minority)", "Investors", "External", "Owner, 12%", "Better reporting for exit planning", [2, 3, 3, 2, 2, 2, 2, 4, 4, 1, 1, 2], 3, 3],
    ["S10", "Key accounts (top 20)", "Customers", "External", "62% of revenue", "No invoicing or delivery errors", [3, 3, 1, 2, 1, 4, 4, 4, 3, 5, 2, 2], 0, 2],
    ["S11", "Wholesale customers", "Customers", "External", "21% of revenue", "EDI ordering keeps working", [2, 2, 1, 1, 1, 3, 2, 3, 3, 3, 3, 1], 0, 2],
    ["S12", "Webshop consumers", "Customers", "External", "11% of revenue", "Accurate stock and delivery dates", [1, 1, 1, 1, 1, 3, 2, 3, 3, 2, 4, 1], 0, 0],
    ["S13", "Public-sector buyers", "Customers", "External", "6% of revenue", "E-invoicing format compliance", [2, 2, 1, 1, 1, 2, 1, 5, 3, 2, 2, 1], 0, 2],
    ["S14", "ERP vendor", "Partners", "External", "Supplier", "Signed scope, timely test feedback", [4, 3, 2, 3, 1, 3, 3, 4, 3, 1, 1, 5], 2, 3],
    ["S15", "3PL logistics partner", "Partners", "External", "Supplier", "Label and booking API on time", [2, 3, 1, 2, 1, 4, 3, 3, 3, 1, 1, 3], 2, 3],
    ["S16", "Works council", "Authorities & reps", "Internal", "Employee rep.", "Consulted on scanner logging", [4, 2, 1, 3, 3, 4, 2, 5, 3, 1, 1, 2], 2, 3],
    ["S17", "External auditor", "Authorities & reps", "External", "Audit firm", "Traceable data migration", [3, 2, 1, 2, 3, 2, 3, 5, 3, 1, 1, 4], 2, 2],
    ["S18", "Tax authority", "Authorities & reps", "External", "Public body", "VAT reporting without gaps", [4, 1, 1, 2, 4, 1, 2, 5, 3, 1, 1, 2], 2, 2],
  ] as const).map(([id, title, cat, type, org, need, sc, c, d]) => ({ id, title, cat, type, org, need, links: [], sc: sd([...sc]), engCurrent: c, engDesired: d }));

  const P = (([
    ["P1", "Mette Lund", "Project manager", "Project team", "Example Trading", "Plan, budget and steering reports", ""],
    ["P2", "Jonas Berg", "Tech lead", "Project team", "Example Trading", "Configuration, integrations, data migration", "S2"],
    ["P3", "Sara Nielsen", "Change lead", "Project team", "Example Trading", "Training, super-users and adoption", ""],
    ["P4", "Karim Haddad", "Finance lead", "Project team", "Example Trading", "Finance processes and reconciliation", "S3"],
    ["P5", "Line Holm", "HR partner", "Project team", "Example Trading", "Works council dialogue", ""],
    ["P6", "Anders Kjær", "Sales lead", "Project team", "Example Trading", "Customer communication", "S5"],
    ["P7", "Ida Vestergaard", "Logistics lead", "Project team", "Example Trading", "Warehouse and 3PL", "S4"],
    ["P8", "Omar Said", "E-commerce lead", "Project team", "Example Trading", "Webshop integration", ""],
    ["P9", "Hanne Juhl", "CFO", "Steering committee", "Example Trading", "Project sponsor and budget owner", "S1"],
    ["P10", "Peter Friis", "CEO", "Steering committee", "Example Trading", "Chairs steering committee, owner relations", ""],
    ["P11", "Lisbeth Krog", "Investment director", "Investors", "Pension fund", "Board member, approves programme budget", "S6"],
    ["P12", "Niels Bach", "Family representative", "Investors", "Founding family", "Board member", "S7"],
    ["P13", "Maria Thomsen", "Account manager", "Investors", "Bank", "Covenant reporting", "S8"],
    ["P14", "Erik Strand", "Partner", "Investors", "Venture fund", "Board observer", "S9"],
    ["P15", "Jens Olsen", "Purchasing manager", "Customers", "Largest key account", "Voice of the top 20 accounts", "S10"],
    ["P16", "Tobias Weiss", "Delivery lead", "Partners", "ERP vendor", "Vendor team and configuration", "S14"],
    ["P17", "Camilla Dahl", "Integration manager", "Partners", "3PL partner", "Label and booking API", "S15"],
    ["P18", "Bo Mikkelsen", "Chair", "Authorities & reps", "Works council", "Employee consultation", "S16"],
    ["P19", "Rikke Sand", "Audit partner", "Authorities & reps", "Audit firm", "Signs off migration", "S17"],
  ]) as string[][]).map(([id, title, role, group, org, resp, s]) => ({ id, title, role, group, org, resp, links: [], stakeholder: s || undefined }));

  const R: Risk[] = ([
    ["R1", "Vendor delivers configuration late", "External", ["S14", "S2"], "P1", "Weekly vendor checkpoint, penalty clause", "Open", [4, 4, 3, 5, 1, 2, 4, 2, 4]],
    ["R2", "Key users unavailable during month-end close", "Organisational", ["S3", "S1"], "P3", "Test windows outside close; sponsor approves backfill", "Open", [3, 4, 2, 4, 1, 3, 3, 2, 2]],
    ["R3", "Warehouse staff resist new scanner workflow", "Organisational", ["S4", "S16"], "P3", "Super-users on each shift, time trial", "Open", [4, 3, 1, 2, 2, 3, 2, 3, 2]],
    ["R4", "Data migration errors in open ledgers", "Technical", ["S2", "S3", "S17", "S18"], "P2", "Three dry runs, auditor signs reconciliation", "Mitigating", [3, 5, 4, 3, 3, 5, 2, 4, 2]],
    ["R5", "Business units keep adding requirements during design", "Financial", ["S1", "S14", "S6"], "P1", "Change board, 10% contingency", "Open", [2, 4, 5, 2, 1, 1, 3, 2, 3]],
    ["R6", "Invoicing disruption at go-live", "Commercial", ["S10", "S11", "S3"], "P4", "Parallel invoicing for two weeks", "Open", [2, 5, 4, 1, 5, 3, 1, 3, 2]],
    ["R7", "Works council approval comes late", "Organisational", ["S16"], "P5", "Early briefing on scanner logging", "Open", [2, 3, 1, 3, 1, 1, 3, 1, 4]],
    ["R8", "Webshop integration fails in test", "Technical", ["S2", "S14", "S12"], "P8", "Mock API in sprint 2, CSV fallback", "Open", [3, 3, 2, 3, 2, 3, 4, 2, 3]],
    ["R9", "Sponsor attention shifts elsewhere", "Organisational", ["S1"], "P1", "Monthly 20-minute steering slot", "Watching", [2, 3, 1, 2, 1, 1, 2, 4, 3]],
    ["R10", "Loan covenant breach if go-live slips to Q3", "Financial", ["S8", "S1"], "P9", "Agree waiver window with bank now", "Open", [2, 5, 5, 1, 3, 1, 1, 2, 4]],
    ["R11", "3PL label API not ready", "Technical", ["S15", "S2"], "P7", "Manual label fallback for 4 weeks", "Open", [3, 3, 2, 4, 2, 2, 3, 2, 4]],
    ["R12", "Key accounts leave after delivery errors", "Commercial", ["S10", "S5"], "P6", "Account managers call top 20 in go-live week", "Open", [2, 4, 4, 1, 5, 2, 1, 4, 3]],
    ["R13", "Owners demand cost cuts mid-project", "Financial", ["S6", "S7"], "P10", "Quarterly benefits report to the board", "Watching", [2, 4, 4, 3, 1, 2, 2, 2, 5]],
  ] as [string, string, string, string[], string, string, string, number[]][]).map(([id, title, cat, links, owner, mit, status, sc]) => ({ id, title, cat, links, owner, mit, status, sc: rd(sc) }));

  // Why each risk could happen, and how hard it would hit resources (price
  // and time come from the scores above).
  const why: Record<string, [string, number, string]> = {
    R1: ["The vendor runs several go-lives in the same quarter", 3, "Configuration complete slips 4–6 weeks"],
    R2: ["Testing is planned in the same weeks as month-end close", 4, "Test cycles stretch, finance works overtime"],
    R3: ["The new scanners add steps for night-shift staff", 3, "Lower picking speed in the first months"],
    R4: ["Old ledgers hold years of manual corrections", 4, "Extra dry run and auditor hours"],
    R5: ["There is no change board until design is signed off", 2, "Contingency used up before build starts"],
    R6: ["Invoice templates and VAT codes are rebuilt from scratch", 2, "Late invoices to key accounts in the first weeks"],
    R7: ["Scanner logging touches employee monitoring rules", 1, "Warehouse rollout waits for approval"],
    R8: ["The webshop API is undocumented", 3, "Manual order entry until fixed"],
    R9: ["A merger project starts on the same board agenda", 2, "Slower decisions on scope and budget"],
    R10: ["The covenant test date falls right after go-live", 1, "Bank waiver costs and owner scrutiny"],
    R11: ["The 3PL builds a new label API in parallel", 2, "Manual labels for 4 weeks"],
    R12: ["Delivery dates are wrong while stock data settles", 2, "Account managers spend weeks on recovery calls"],
    R13: ["Group results are weak this year", 3, "Scope cut mid-project"],
  };
  for (const r of R) { const w = why[r.id]; if (w) { r.cause = w[0]; r.sc.res = w[1]; r.consequence = w[2]; } }
  const base = projectFromTemplate("it", "en", "ERP rollout");
  return {
    ...base,
    id: "example",
    name: "ERP rollout (example)",
    org: "Example Trading A/S",
    phase: 2,
    charter: {
      purpose: "Replace the 14-year-old ERP with one system for finance, warehouse and sales, so the company can close books faster and grow online without adding staff.",
      inScope: "Finance, warehouse, sales orders, webshop and 3PL integration, data migration, training.",
      outScope: "Payroll, CRM replacement, EDI for wholesale customers.",
      budgetNote: "5.9M DKK including 0.5M contingency.",
      goLive: "2027-05-03",
      links: ["P9", "S6", "S7", "B1", "B2", "B3", "B4", "M5"],
    },
    stakeholders: S,
    people: P,
    risks: R,
    issues: [
      { id: "I1", title: "Test environment down for 4 days", prio: "High", status: "Open", owner: "P2", from: "R1", links: ["S14", "S2"] },
      { id: "I2", title: "Chart of accounts mapping disputed", prio: "High", status: "In progress", owner: "P4", from: "R4", links: ["S3", "S17"] },
      { id: "I3", title: "Night shift missed scanner training", prio: "Medium", status: "Open", owner: "P3", from: "R3", links: ["S4"] },
      { id: "I4", title: "Vendor invoices 12 extra configuration days", prio: "Medium", status: "Escalated", owner: "P1", from: "R5", links: ["S14", "D3"] },
    ],
    decisions: [
      { id: "D1", title: "Phased go-live: finance first, warehouse 4 weeks later", date: "2026-10-02", by: "P9", links: ["R3", "R6", "M5"], tpl: "Big bang or phased go-live" },
      { id: "D2", title: "Keep webshop on CSV export until Q3", date: "2026-10-21", by: "P2", links: ["R8", "S12"], tpl: "Which integrations go live on day one" },
      { id: "D3", title: "Approve 12 extra vendor days from contingency", date: "2026-11-12", by: "P9", links: ["R5", "C2"] },
      { id: "D4", title: "Brief works council before scanner rollout", date: "2026-11-18", by: "P10", links: ["R7", "S16"] },
    ],
    assumptions: [
      { id: "A1", kind: "Assumption", title: "Vendor keeps the same consultant team", status: "Unverified", links: ["R1", "S14"] },
      { id: "A2", kind: "Assumption", title: "Finance can release 2 key users at 50%", status: "Confirmed", links: ["R2", "S3"] },
      { id: "A3", kind: "Dependency", title: "3PL delivers new label API by February", status: "At risk", links: ["R11", "S15", "M2"] },
      { id: "A4", kind: "Dependency", title: "Bank resets covenant test date before go-live", status: "In talks", links: ["R10", "S8"] },
    ],
    changes: [
      { id: "C1", title: "Add EDI ordering for wholesale customers", by: "S11", cost: 180, weeks: 3, status: "Under review", links: ["R5"] },
      { id: "C2", title: "12 extra configuration days", by: "S14", cost: 144, weeks: 0, status: "Approved", links: ["R5"] },
      { id: "C3", title: "Mobile approval app for CFO", by: "S1", cost: 60, weeks: 2, status: "Rejected", links: [] },
    ],
    milestones: [
      { id: "M1", title: "Scope signed", date: "2026-09-15", done: true, links: ["R5"] },
      { id: "M2", title: "Configuration complete", date: "2027-01-20", done: false, links: ["R1", "R8", "R11"] },
      { id: "M3", title: "Migration dry run 3", date: "2027-03-05", done: false, links: ["R4"] },
      { id: "M4", title: "Training finished", date: "2027-04-10", done: false, links: ["R2", "R3", "R7"] },
      { id: "M5", title: "Go-live (finance)", date: "2027-05-03", done: false, links: ["R6", "R4", "R10", "R12"] },
    ],
    tasks: [
      { id: "T1", title: "Weekly vendor checkpoint", col: "doing", owner: "P1", links: ["R1", "S14"] },
      { id: "T2", title: "Book test windows outside close", col: "done", owner: "P4", links: ["R2"] },
      { id: "T3", title: "Appoint super-users per shift", col: "doing", owner: "P3", links: ["R3"] },
      { id: "T4", title: "Migration dry run 2", col: "todo", owner: "P2", links: ["R4", "M3"] },
      { id: "T5", title: "Set up change board", col: "done", owner: "P1", links: ["R5"] },
      { id: "T6", title: "Plan parallel invoicing", col: "todo", owner: "P4", links: ["R6", "M5"] },
      { id: "T7", title: "Brief works council", col: "todo", owner: "P5", links: ["R7", "D4"] },
      { id: "T8", title: "Build mock webshop API", col: "doing", owner: "P8", links: ["R8"] },
      { id: "T9", title: "Covenant waiver meeting with bank", col: "todo", owner: "P9", links: ["R10", "A4"] },
      { id: "T10", title: "Call plan for top 20 accounts", col: "todo", owner: "P6", links: ["R12", "S10"] },
    ],
    benefits: [
      { id: "B1", title: "Month-end close from 8 to 4 days", kpi: "Days to close", owner: "P4", links: ["M5", "S3"] },
      { id: "B2", title: "Inventory accuracy from 92% to 99%", kpi: "Cycle count match", owner: "P7", links: ["R3", "S4"] },
      { id: "B3", title: "Invoice errors halved", kpi: "Credit notes per month", owner: "P6", links: ["R6", "S10"] },
      { id: "B4", title: "Licence and hosting cost down 15%", kpi: "Annual IT run cost", owner: "P9", links: ["S6", "R13"] },
    ],
    lessons: [
      { id: "L1", title: "Book key users before the vendor contract is signed", source: "Previous CRM project", links: ["R2"] },
      { id: "L2", title: "Involve the works council already at scoping", source: "Warehouse move 2024", links: ["R7", "S16"] },
      { id: "L3", title: "Run invoicing in parallel; it is cheaper than one bad month", source: "Industry peer", links: ["R6", "B3"] },
    ],
    wbs: [
      { id: "W1", code: "1", title: "Project management", owner: "P1", start: "2026-09-01", end: "2027-06-30", progress: 30, links: ["R9"] },
      { id: "W2", code: "2", title: "Design and configuration", owner: "P2", start: "2026-09-15", end: "2027-01-20", progress: 60, links: ["R1", "S14"] },
      { id: "W3", code: "3", title: "Data", owner: "P2", start: "2026-11-01", end: "2027-04-15", progress: 20, links: ["R4", "M3"] },
      { id: "W4", code: "4", title: "Integrations", owner: "P8", start: "2026-11-15", end: "2027-03-01", progress: 15, links: ["R8", "R11", "D2"] },
      { id: "W5", code: "5", title: "Change and training", owner: "P3", start: "2027-01-01", end: "2027-04-10", progress: 0, links: ["R3", "M4"] },
      { id: "W6", code: "6", title: "Go-live and hypercare", owner: "P1", start: "2027-04-25", end: "2027-06-30", progress: 0, links: ["M5", "D1", "R12"] },
    ],
    goals: [
      { id: "G1", title: "Faster, more reliable financial reporting", links: [] },
      { id: "G2", title: "Order handling that scales with online growth", links: [] },
      { id: "G3", title: "Warehouse runs on one accurate stock picture", parent: "G2", links: [] },
    ],
    criteria: [
      { id: "SC1", title: "Month-end close in 4 working days", target: "≤ 4 days (today 8)", status: "Agreed", owner: "P4", serves: ["G1"], links: ["B1"] },
      { id: "SC2", title: "Migrated balances reconcile to the cent", target: "0 unexplained differences", status: "Draft", owner: "P2", parent: "SC1", serves: ["G1"], links: ["R4"] },
      { id: "SC3", title: "Invoice errors halved", target: "≤ 15 credit notes / month", status: "Draft", owner: "P6", serves: ["G1", "G2"], links: ["B3"] },
      { id: "SC4", title: "Inventory accuracy 99%", target: "≥ 99% cycle-count match", status: "Draft", owner: "P7", serves: ["G3"], links: ["B2"] },
      { id: "SC5", title: "Orders flow without manual re-entry", target: "100% of webshop and EDI orders", status: "Agreed", owner: "P8", serves: ["G2"], links: [] },
    ],
    deliverables: [
      { id: "DL1", title: "Configured finance module", owner: "P2", due: "2027-01-20", status: "Agreed", serves: ["SC1", "SC3"], links: ["R1"] },
      { id: "DL2", title: "Migrated and reconciled ledgers", owner: "P2", due: "2027-03-05", status: "Draft", serves: ["SC2"], links: ["R4", "M3"] },
      { id: "DL3", title: "Scanner workflow in the warehouse", owner: "P7", due: "2027-04-10", status: "Draft", serves: ["SC4"], links: ["R3"] },
      { id: "DL4", title: "Webshop and 3PL integrations", owner: "P8", due: "2027-02-28", status: "Agreed", serves: ["SC5", "SC4"], links: ["R8", "R11"] },
      { id: "DL5", title: "Trained super-users on every shift", owner: "P3", due: "2027-04-10", status: "Draft", serves: ["SC3", "SC4"], links: ["R2"] },
      { id: "DL6", title: "Training material and quick guides", owner: "P3", due: "2027-03-20", status: "Draft", parent: "DL5", serves: [], links: [] },
    ],
    budget: [
      { id: "BU1", area: "Licences", plan: 1200, act: 1200, fc: 1200, fileId: "F1", range: "Summary!C4", links: [] },
      { id: "BU2", area: "Vendor services", plan: 2400, act: 1900, fc: 2544, fileId: "F2", range: "all rows", links: ["C2", "R1"] },
      { id: "BU3", area: "Internal staff", plan: 1100, act: 700, fc: 1150, fileId: "F3", range: "Priced!F2:F40", links: ["R2"] },
      { id: "BU4", area: "Training", plan: 300, act: 50, fc: 300, fileId: "F1", range: "Training!B3:E12", links: ["R3"] },
      { id: "BU5", area: "Scanners and hardware", plan: 400, act: 380, fc: 380, fileId: "F1", range: "Hardware!B3:E9", links: [] },
      { id: "BU6", area: "Contingency", plan: 500, act: 144, fc: 500, fileId: "F1", range: "Contingency!B2:D8", links: ["R5", "D3"] },
    ],
    files: [
      { id: "F1", name: "ERP_budget_2027.xlsx", ext: "XLSX", where: "SharePoint › Projects › ERP rollout", synced: "2026-11-24", note: "Master budget, 4 sheets" },
      { id: "F2", name: "Vendor_invoices_2026.csv", ext: "CSV", where: "Finance system export", synced: "2026-11-23", note: "Actuals for vendor services" },
      { id: "F3", name: "Timesheets_Q4.xlsx", ext: "XLSX", where: "HR system export", synced: "2026-11-22", note: "Internal hours, priced" },
    ],
    raci: [
      { id: "X1", task: "Approve scope and budget", a: { P9: "A", P10: "C", P11: "C", P1: "R", P2: "C" } },
      { id: "X2", task: "Configure ERP", a: { P16: "R", P2: "A", P4: "C", P1: "I" } },
      { id: "X3", task: "Migrate data", a: { P2: "R", P4: "A", P19: "C", P16: "C" } },
      { id: "X4", task: "Train users", a: { P3: "R", P7: "R", P18: "C", P9: "I" } },
      { id: "X5", task: "Go-live decision", a: { P9: "A", P1: "R", P2: "C", P4: "C", P10: "I" } },
    ],
    raciPeople: ["P1", "P2", "P3", "P4", "P7", "P9", "P10", "P11", "P16", "P18", "P19"],
    swot: {
      s: [{ id: "sw1", text: "Committed sponsor with budget authority", links: ["P9"] }, { id: "sw2", text: "Finance team already trained in process design", links: ["S3"] }],
      w: [{ id: "sw3", text: "Warehouse staff sceptical of scanners", links: ["R3", "S4"] }, { id: "sw4", text: "Thin internal IT bench", links: ["S2", "R2"] }],
      o: [{ id: "sw5", text: "Faster month-end close", links: ["B1"] }, { id: "sw6", text: "Better data for the owners’ exit planning", links: ["S9", "B4"] }],
      t: [{ id: "sw7", text: "Vendor capacity", links: ["R1"] }, { id: "sw8", text: "Loan covenant timing", links: ["R10"] }, { id: "sw9", text: "Key account churn", links: ["R12"] }],
    },
    analyses: defaultAnalyses(S, "en"),
    enabled: [...DEFAULT_TOOLS],
  };
}

export const EXAMPLE_NOTE = L("Example data. All names are fictional.", "Eksempeldata. Alle navne er fiktive.");
