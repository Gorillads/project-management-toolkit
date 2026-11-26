# Project Management Toolkit

A project management workspace where every tool knows about every other
tool. A risk links to the stakeholders it involves, an issue links back to
the risk it came from, a decision links to the milestones it changes, and
every item shows where else it appears. Built as a sibling of the
[CV Builder](https://github.com/Gorillads/CV-builder): same stack, same look,
same Danish/English toggle, same "your data stays in your browser" model.

**Live:** https://gorillads.github.io/project-management-toolkit/

## Start simple, add as you go

Every project starts with the **core**:

- **Overview**: the project's name and purpose, counts, the power/interest
  grid, the probability × impact map and the stakeholder ↔ risk network.
- **Actors**: the team running the project and the stakeholders around it,
  in one list, with each stakeholder on the power/interest grid. Selecting an
  actor shows the risks they own or are affected by.
- **Risks**: probability, impact, owner and the actors each risk affects.

Everything else is an **add-on**, switched on from "Add tools" on the
Overview when the project needs it: stakeholder analysis (12 dimensions,
saved analyses, comparison), risk analysis (lenses, assumptions and
dependencies), issue log with ⚑ flags on risks, decision log, change
requests, project templates, charter, work breakdown, schedule, task board,
budget with linked spreadsheets, people directory, RACI, engagement matrix,
communication plan, SWOT, benefits and lessons learned. Removing an add-on
keeps its data.

## Groups and categories

Team members and stakeholders can belong to a group, but don't have to: new
ones start with no group. "Edit groups" on the Actors page edits the team
groups and stakeholder groups, and "Edit categories" on the Risks page edits
the risk categories. Add new ones, rename one (everyone in it moves along),
reorder, or remove one (its members are kept, just without a group). New
projects start with two team groups, Project team and Steering committee.

## IDs

Every new item gets an ID field. Leave it empty and the next free ID is
chosen (P1, S1, R1…); type your own (e.g. `IT-DRIFT`) and it is used if
no other item has it. IDs can be changed later in the item's editor, and the
new ID is carried into every link that points at it. Clearing a custom ID
gives the item an automatic one again.

## Starting a project

The **+** in the tab bar opens a five-step setup: the project (name,
organisation, purpose and a project type that suggests typical stakeholders
and risks), the team, the stakeholders (with power and interest), the risks
(with probability, impact, owner and the stakeholders they affect) and a
review that shows the IDs everything will get. Unfinished answers are kept if
the dialog is closed.

Project types are broad categories, each suggesting typical stakeholders,
risks, phases, decisions and add-on tools: General project, Construction &
Engineering, IT & Software Development, Marketing & Creative, Research &
Development, Event planning, Organisational change & HR, Operations & Process
improvement, Product launch, Education & Training, Public sector & Non-profit,
and Finance, Legal & Compliance. Projects made with an earlier, narrower type
(ERP rollout, app launch, restructuring, office move) are mapped to the
matching category.

## Working in it

- **Search** (Ctrl+K) finds any item by ID or words in its title, role,
  mitigation or notes, and jumps to it.
- **Undo / redo** (Ctrl+Z, Ctrl+Shift+Z, or the arrows in the header) per
  project.
- **How it works** (the ? in the tab bar) is a short guide, shown once.
- **Budget from a spreadsheet** (add-on): link a CSV with columns Area,
  Plan, Spent and Forecast (or Område, Plan, Forbrugt, Prognose).

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
