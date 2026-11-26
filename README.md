# Project Management Toolkit

**Focus: developing and shaping a project in its early phases.** The toolkit
helps you work out why a project exists, how you will know it succeeded, what
it will deliver, who is involved and what could go wrong, and checks that
these fit together. Tools for running a project once it has started (issue
log, task board, change requests) are kept apart as a later phase and will be
built out later.

A project management workspace where every tool knows about every other
tool. A risk links to the stakeholders it involves, an issue links back to
the risk it came from, a decision links to the milestones it changes, and
every item shows where else it appears. Built as a sibling of the
[CV Builder](https://github.com/Gorillads/CV-builder): same stack, same look,
same Danish/English toggle, same "your data stays in your browser" model.

**Live:** https://gorillads.github.io/project-management-toolkit/

## How well-shaped is the project?

The Overview opens with a development checklist: the purpose is written and
has success criteria; every success criterion has a target; every
criterion has a deliverable and every deliverable a reason; the team is named;
stakeholders and risks are identified; every risk has an owner, a response and
a link to what it affects; and success criteria and deliverables are agreed.
Each step shows how far it is (e.g. 3/5) and jumps to the first gap.

Success criteria and deliverables are marked Draft or Agreed while the project
is shaped; progress tracking belongs to the later management phase.

The **Stakeholder analysis** add-on analyses the stakeholders from the
Actors tab; it does not add or edit actors (a link takes you to Actors for
that). Pick or create an analysis, then set it up in three steps: name,
who is included (by group or individually), and which two dimensions to
compare (or add your own). The result is the grid and a score table where
scores can be changed. Compare shows every analysis side by side.

The **Decision log** add-on lists what is still **to decide** (each with who
decides, a person or a group such as the steering committee, and a
decide-by date; overdue ones are flagged) and a timeline of what has been
**decided**. Each decision records the question, the options considered with
a short for and against and what each would cost on price, time and
resources, the chosen option and why, and what it affects (risks, success
criteria, deliverables, actors). Choosing an option marks the decision as
made. Risks, success criteria and deliverables have a **Raise a decision**
button that creates a linked open decision. When the add-on is on, the
Overview checklist asks that every open decision has someone who decides
and a date. In the CSV the options are summarised; the project file keeps
them in full.

## Owners and responsibility

Everything someone is responsible for (risks, issues, tasks, benefits, work
packages, success criteria, deliverables and who decides a decision) can have
**several owners**: team members, team groups such as the steering
committee, and for decisions also stakeholders and stakeholder groups.
Marking one of them as the **primary owner** is optional (click the star,
click again to clear). A group owner follows the group if it is renamed.
In the **RACI matrix** columns can be people or team groups; R
(responsible) can be several, and A (accountable) is the optional primary
owner, at most one per task. In the CSV, owners share the Owner column,
separated by spaces, the primary marked `*` (e.g. `P2* P4
group:Steering_committee`).

## Arrange each tab

Every core tab (Overview, Purpose & success, Actors, Risks) is made of
panels. Click **Arrange** at the top of a tab to drag a panel by its bar or
move it with the arrows, put it in the left column, the right column or the
full width, hide it, or change how wide the two columns are. Hidden panels
are listed at the top of the tab and come back with one click. **Reset
layout** restores the default. The layout is remembered per tab in this
browser.

## Start simple, add as you go

Every project starts with the **core**:

- **Purpose & success**: the project's why and how, as a hierarchy of
  three levels. One **purpose** (the overall goal or vision, written in this
  tab and separate from the description on the Overview); measurable
  **success criteria** (with sub-criteria) that show the purpose is reached;
  and **deliverables** (with sub-deliverables), the actual hand-ins, each
  counting towards one or more criteria. Drawn as three bands with lines
  between them: read upwards for why, downwards for how. A sub-item sits
  directly below the item it belongs to. Items can be moved by dragging
  them in the diagram (onto the edge of another item to sit beside it, onto
  the middle to go under it, a deliverable onto a criterion to count towards
  it) or with the Position buttons in the editor; **Tidy up** orders the
  deliverables after the criteria so fewer lines cross. Clicking an item
  highlights its chain, and a logic check flags a purpose nobody measures,
  criteria nothing delivers, and deliverables with no reason. Older projects
  with sub-goals are converted: each sub-goal becomes a success criterion,
  with the criteria that measured it as its sub-criteria. Example: a bridge
  whose purpose is to connect two areas, measured by "two lanes of
  traffic", delivered as a working bridge with a given capacity.
- **Overview**: the project's name and description, counts, the power/interest
  grid, the probability × impact map and the stakeholder ↔ risk network.
- **Actors**: the team running the project and the stakeholders around it,
  in one list, with each stakeholder on the power/interest grid. Selecting an
  actor shows the risks they own or are affected by. Switch between
  **Individuals** and **Groups** to see the team groups (e.g. Project team,
  Steering committee) and stakeholder groups as one row each, with their
  members, the risks the group owns or is affected by, and for stakeholder
  groups the average power and interest (members are highlighted on the
  grid). Members can be added to or removed from a group there.
- **Risks**: what could happen and why (the cause), its probability, and its
  consequence on the three sides of the project triangle: **price, time and
  resources** (0–5 each), with quality in the middle as what is at stake. A
  risk's overall impact is the worst of the three. "Deadline slips" or "Budget
  overrun" are consequences, not risks: a risk named like that, without a
  cause, gets a nudge to describe what could cause it. The **quality
  triangle** places each risk towards the sides it threatens and shows the
  exposure per side. Every project type suggests risks as events with a cause
  and a typical consequence. Risk owners work like every other
  responsibility in the toolkit (see below).

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
The new-project setup has the same "Edit groups" panel in its Team and
Stakeholders steps, and suggested stakeholders start without a group.

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
