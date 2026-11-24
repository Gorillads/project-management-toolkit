# Project Management Toolkit

A project management workspace where every tool knows about every other
tool. A risk links to the stakeholders it involves, an issue links back to
the risk it came from, a decision links to the milestones it changes, and
every item shows where else it appears. Built as a sibling of the
[CV Builder](https://github.com/Gorillads/CV-builder): same stack, same look,
same Danish/English toggle, same "your data stays in your browser" model.

**Live:** https://gorillads.github.io/project-management-toolkit/

## Tools

| Group | Tools |
|---|---|
| Project | Overview (dashboard, pinned charts, stakeholder ↔ risk network, tool library), Project templates, Project charter |
| Registers | Stakeholders, Risks (with Assumptions & dependencies), Issue log, Decision log, Change requests (optional) |
| Planning | Work breakdown, Schedule & milestones (Gantt), Task board, Budget with linked source files |
| People | People directory, RACI matrix, Engagement matrix, Communication plan |
| Strategy & review | SWOT, Benefits register, Lessons learned |

Each project chooses which tools it uses in the tool library on the Overview.

## Ideas the app is built around

- **Swappable axes.** Stakeholders are scored 1–5 on 12 dimensions (power,
  interest, monetary investment, direct influence, decision authority,
  urgency, legitimacy, support, share of revenue, risk of churn…), and risks
  on 9 (probability, overall, financial, schedule and reputation impact,
  proximity, detectability…). An *analysis* or *lens* picks two of them, a
  set of stakeholders or risk categories, and a 2×2 or 5×5 grid. You can add
  your own dimensions, save analyses (e.g. "investors only"), compare them
  side by side, and pin them to the Overview.
- **Links are stored once and read both ways.** An item stores the IDs it
  links to; `src/lib/links.ts` builds the backlink index, so "also appears
  in" never drifts. Deleting an item removes it from every link.
- **⚑ turns a risk into an issue.** Flagging opens an issue linked to the
  risk; removing the flag closes it but keeps it in the log.
- **Templates** (ERP rollout, app launch, organisational restructuring,
  office or warehouse move, physical product launch) bring phases with
  decision gates, typical decisions, stakeholders, risks and a tool set.
  The Decision log shows which typical decisions are made and which are
  still ahead.

## Working in it

- **Search** (Ctrl+K) finds any item by ID or words in its title, role,
  mitigation or notes, and jumps to it.
- **Undo / redo** (Ctrl+Z, Ctrl+Shift+Z, or the arrows in the header) per
  project. Typing in a field undoes with the field's own undo.
- **How it works** (the ? in the tab bar) is a five-step guide, shown once on
  the first visit.
- **Budget from a spreadsheet:** link a CSV with columns Area, Plan, Spent and
  Forecast (or Område, Plan, Forbrugt, Prognose). Lines are matched by area
  name, new areas are added, and Danish number formats like `2.010,50` are
  understood. "Read numbers from a CSV" on a linked file updates it again.

## Import and export

- **PowerPoint (.pptx):** one deck covering the whole case: overview,
  stakeholders by type, pinned analyses and risk lenses, issues and
  decisions, milestones, budget chart and people.
- **CSV:** every register in one semicolon-separated file with a BOM, so it
  opens cleanly in Excel. Import reads the same file back; each register in
  the file replaces that register, and fields the CSV does not carry are
  kept from the item with the same ID.
- **JSON:** the whole project, for backup or sharing. Opening a JSON file
  adds it as a new project tab.

## Development

```bash
npm install
npm run dev
```

`npm run build` type-checks and builds to `dist/`. `npm run lint` runs oxlint.
Pushing to `main` deploys to GitHub Pages through
`.github/workflows/deploy-pages.yml`.

Data is kept in `localStorage` under `project-toolkit-v1`. Up to 10
projects can be open as tabs.
