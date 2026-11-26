import type { L10n } from "../model/types";
import { L } from "./catalog";

export interface Template {
  id: string;
  name: L10n;
  desc: L10n;
  phases: [L10n, L10n][];
  /** Typical stakeholders: [name, category, Internal/External]. */
  groups: [L10n, string, "Internal" | "External"][];
  /** Typical risks: [title, category]. */
  risks: [L10n, string][];
  decisions: L10n[];
  tools: string[];
}

export const TEMPLATES: Template[] = [
  {
    id: "general",
    name: L("General project", "Generelt projekt"),
    desc: L("Any project. Start with the basics and add what you need.", "Alle slags projekter. Start med det grundlæggende og tilføj det, du har brug for."),
    phases: [
      [L("Start", "Start"), L("Project approved", "Projekt godkendt")],
      [L("Plan", "Planlæg"), L("Plan approved", "Plan godkendt")],
      [L("Deliver", "Gennemfør"), L("Result accepted", "Resultat godkendt")],
      [L("Close", "Afslut"), L("Project closed", "Projekt afsluttet")],
    ],
    groups: [
      [L("Project sponsor", "Projektejer"), "Internal", "Internal"],
      [L("Management", "Ledelse"), "Internal", "Internal"],
      [L("Users", "Brugere"), "Internal", "Internal"],
      [L("Customers", "Kunder"), "Customers", "External"],
      [L("Suppliers", "Leverandører"), "Partners", "External"],
    ],
    risks: [
      [L("Deadline slips", "Tidsplanen skrider"), "Organisational"],
      [L("Budget overrun", "Budgetoverskridelse"), "Financial"],
      [L("Key people unavailable", "Nøglepersoner er ikke til rådighed"), "Organisational"],
      [L("Unclear or changing requirements", "Uklare eller skiftende krav"), "Organisational"],
    ],
    decisions: [L("Go / no-go to start", "Go / no-go for start"), L("Approve the plan", "Godkend planen"), L("Accept the result", "Godkend resultatet")],
    tools: ["stakeholders", "issues", "decisions", "schedule", "board"],
  },
  {
    id: "erp",
    name: L("ERP / IT system rollout", "ERP / IT-systemudrulning"),
    desc: L("Replace or introduce a business system across departments.", "Udskift eller indfør et forretningssystem på tværs af afdelinger."),
    phases: [
      [L("Initiate", "Igangsæt"), L("Business case approved", "Business case godkendt")],
      [L("Select", "Vælg"), L("Vendor and scope signed", "Leverandør og scope underskrevet")],
      [L("Design & build", "Design og opsætning"), L("Configuration accepted", "Opsætning godkendt")],
      [L("Test & migrate", "Test og migrering"), L("Go/no-go for go-live", "Go/no-go for idriftsættelse")],
      [L("Go-live", "Idriftsættelse"), L("Handover to operations", "Overdragelse til drift")],
    ],
    groups: [
      [L("Steering committee", "Styregruppe"), "Internal", "Internal"],
      [L("Key users", "Superbrugere"), "Internal", "Internal"],
      [L("IT operations", "IT-drift"), "Internal", "Internal"],
      [L("System vendor", "Systemleverandør"), "Partners", "External"],
      [L("Works council", "Samarbejdsudvalg"), "Authorities & reps", "Internal"],
      [L("External auditor", "Ekstern revisor"), "Authorities & reps", "External"],
      [L("Key customers", "Nøglekunder"), "Customers", "External"],
    ],
    risks: [
      [L("Vendor delivers late", "Leverandøren leverer for sent"), "External"],
      [L("Data migration errors", "Fejl i datamigrering"), "Technical"],
      [L("Low user adoption", "Lav brugeradoption"), "Organisational"],
      [L("Integrations fail in test", "Integrationer fejler i test"), "Technical"],
      [L("Budget overrun", "Budgetoverskridelse"), "Financial"],
    ],
    decisions: [
      L("Buy standard system or build", "Købe standardsystem eller udvikle selv"),
      L("Which vendor", "Valg af leverandør"),
      L("Big bang or phased go-live", "Big bang eller faseopdelt idriftsættelse"),
      L("Which data to migrate or archive", "Hvilke data der migreres eller arkiveres"),
      L("Which integrations go live on day one", "Hvilke integrationer går live på dag ét"),
      L("Go / no-go for go-live", "Go / no-go for idriftsættelse"),
    ],
    tools: ["charter", "stakeholders", "risks", "issues", "decisions", "wbs", "schedule", "board", "budget", "people", "raci", "engagement", "comms", "benefits", "lessons"],
  },
  {
    id: "app",
    name: L("App launch", "Lancering af app"),
    desc: L("Build and launch a mobile or web app to real users.", "Byg og lancér en mobil- eller webapp til rigtige brugere."),
    phases: [
      [L("Discover", "Afdæk"), L("Problem worth solving", "Problemet er værd at løse")],
      [L("Build MVP", "Byg MVP"), L("MVP scope frozen", "MVP-scope låst")],
      [L("Beta", "Beta"), L("Beta exit criteria met", "Kriterier for at afslutte beta er opfyldt")],
      [L("Launch", "Lancering"), L("Launch go/no-go", "Go/no-go for lancering")],
      [L("Grow", "Vækst"), L("Scale, pivot or stop", "Skalér, justér eller stop")],
    ],
    groups: [
      [L("Product owner", "Produktejer"), "Internal", "Internal"],
      [L("Development team", "Udviklingsteam"), "Internal", "Internal"],
      [L("Beta users", "Betabrugere"), "Customers", "External"],
      [L("App stores", "App-butikker"), "Partners", "External"],
      [L("Marketing", "Marketing"), "Internal", "Internal"],
      [L("Investors", "Investorer"), "Investors", "External"],
    ],
    risks: [
      [L("App store rejection", "Afvisning i app-butikken"), "External"],
      [L("Low retention after week 1", "Lav fastholdelse efter uge 1"), "Commercial"],
      [L("Privacy or security breach", "Brud på datasikkerhed eller privatliv"), "Technical"],
      [L("Scope creep", "Scope vokser ukontrolleret"), "Organisational"],
      [L("Server costs grow faster than users", "Serveromkostninger vokser hurtigere end brugere"), "Financial"],
    ],
    decisions: [
      L("Native or cross-platform", "Native eller cross-platform"),
      L("Pricing model", "Prismodel"),
      L("Launch markets", "Lanceringsmarkeder"),
      L("What data we collect", "Hvilke data vi indsamler"),
      L("Feature freeze date", "Dato for feature freeze"),
      L("Go / no-go for launch", "Go / no-go for lancering"),
    ],
    tools: ["charter", "stakeholders", "risks", "issues", "decisions", "schedule", "board", "budget", "people", "comms", "swot", "benefits", "lessons"],
  },
  {
    id: "reorg",
    name: L("Organisational restructuring", "Organisationsændring"),
    desc: L("Change structure, roles or reporting lines in an organisation.", "Ændr struktur, roller eller rapporteringsveje i en organisation."),
    phases: [
      [L("Diagnose", "Diagnose"), L("Case for change agreed", "Behovet for forandring er aftalt")],
      [L("Design", "Design"), L("Target organisation approved", "Målorganisation godkendt")],
      [L("Consult", "Høring"), L("Consultation concluded", "Høring afsluttet")],
      [L("Implement", "Gennemfør"), L("New structure in force", "Ny struktur trådt i kraft")],
      [L("Embed", "Forankr"), L("Review after 6 months", "Evaluering efter 6 måneder")],
    ],
    groups: [
      [L("Board", "Bestyrelse"), "Investors", "External"],
      [L("Management", "Ledelse"), "Internal", "Internal"],
      [L("Employees", "Medarbejdere"), "Internal", "Internal"],
      [L("Unions / works council", "Fagforeninger / SU"), "Authorities & reps", "Internal"],
      [L("HR", "HR"), "Internal", "Internal"],
      [L("Customers", "Kunder"), "Customers", "External"],
      [L("Media", "Medier"), "Authorities & reps", "External"],
    ],
    risks: [
      [L("Loss of key people", "Tab af nøglemedarbejdere"), "Organisational"],
      [L("Errors in the legal consultation process", "Fejl i den lovpligtige høringsproces"), "External"],
      [L("Productivity dip", "Fald i produktivitet"), "Organisational"],
      [L("Rumours before announcement", "Rygter før offentliggørelse"), "Organisational"],
      [L("Customer service gaps", "Huller i kundeservice"), "Commercial"],
    ],
    decisions: [
      L("Scope of the change", "Forandringens omfang"),
      L("Selection criteria for roles", "Udvælgelseskriterier til roller"),
      L("Announcement date and channel", "Dato og kanal for offentliggørelse"),
      L("Severance and redeployment terms", "Vilkår for fratrædelse og omplacering"),
      L("When to review", "Hvornår der evalueres"),
    ],
    tools: ["charter", "stakeholders", "risks", "issues", "decisions", "schedule", "people", "raci", "engagement", "comms", "swot", "lessons"],
  },
  {
    id: "move",
    name: L("Office or warehouse move", "Flytning af kontor eller lager"),
    desc: L("Relocate people, stock or equipment to a new site.", "Flyt medarbejdere, lager eller udstyr til en ny adresse."),
    phases: [
      [L("Plan", "Planlæg"), L("Site and lease signed", "Lokation og lejekontrakt underskrevet")],
      [L("Fit-out", "Indretning"), L("Site ready for handover", "Lokation klar til overtagelse")],
      [L("Prepare", "Forbered"), L("Move plan approved", "Flytteplan godkendt")],
      [L("Move", "Flyt"), L("Operations running at new site", "Drift kører på ny adresse")],
      [L("Close", "Afslut"), L("Old site handed back", "Gammel lokation afleveret")],
    ],
    groups: [
      [L("Management", "Ledelse"), "Internal", "Internal"],
      [L("Employees", "Medarbejdere"), "Internal", "Internal"],
      [L("Landlord", "Udlejer"), "Partners", "External"],
      [L("Movers and contractors", "Flyttefirma og håndværkere"), "Partners", "External"],
      [L("Customers", "Kunder"), "Customers", "External"],
      [L("Municipality", "Kommune"), "Authorities & reps", "External"],
    ],
    risks: [
      [L("Fit-out delays", "Forsinket indretning"), "External"],
      [L("Downtime during the move", "Nedetid under flytningen"), "Commercial"],
      [L("Staff object to longer commute", "Medarbejdere modsætter sig længere transport"), "Organisational"],
      [L("Damaged stock or equipment", "Beskadiget lager eller udstyr"), "Technical"],
      [L("Permit delays", "Forsinkede tilladelser"), "External"],
    ],
    decisions: [
      L("Which site", "Valg af lokation"),
      L("Move in one weekend or in waves", "Flytte på én weekend eller i etaper"),
      L("Which equipment to replace", "Hvilket udstyr der udskiftes"),
      L("Customer notice period", "Varsel til kunder"),
    ],
    tools: ["charter", "stakeholders", "risks", "issues", "decisions", "wbs", "schedule", "board", "budget", "people", "comms", "lessons"],
  },
  {
    id: "product",
    name: L("Physical product launch", "Lancering af fysisk produkt"),
    desc: L("Bring a new physical product to market.", "Bring et nyt fysisk produkt på markedet."),
    phases: [
      [L("Concept", "Koncept"), L("Concept approved", "Koncept godkendt")],
      [L("Develop", "Udvikl"), L("Design frozen", "Design låst")],
      [L("Validate", "Valider"), L("Certification passed", "Certificering bestået")],
      [L("Ramp up", "Opskalér"), L("Production go", "Go for produktion")],
      [L("Launch", "Lancér"), L("Market launch", "Markedslancering")],
    ],
    groups: [
      [L("Product management", "Produktledelse"), "Internal", "Internal"],
      [L("Engineering", "Udvikling"), "Internal", "Internal"],
      [L("Suppliers", "Leverandører"), "Partners", "External"],
      [L("Retailers", "Forhandlere"), "Customers", "External"],
      [L("Certification bodies", "Certificeringsorganer"), "Authorities & reps", "External"],
      [L("Investors", "Investorer"), "Investors", "External"],
    ],
    risks: [
      [L("Certification fails", "Certificering fejler"), "External"],
      [L("Supplier capacity too low", "For lav kapacitet hos leverandør"), "External"],
      [L("Unit cost above target", "Stykpris over mål"), "Financial"],
      [L("Competitor launches first", "Konkurrent lancerer først"), "Commercial"],
      [L("Quality issues in first batch", "Kvalitetsproblemer i første batch"), "Technical"],
    ],
    decisions: [
      L("Target price", "Målpris"),
      L("Make or source components", "Producere selv eller købe komponenter"),
      L("Launch markets and channels", "Lanceringsmarkeder og kanaler"),
      L("Size of first production run", "Størrelse på første produktionsserie"),
      L("Launch date", "Lanceringsdato"),
    ],
    tools: ["charter", "stakeholders", "risks", "issues", "decisions", "wbs", "schedule", "board", "budget", "people", "swot", "benefits", "lessons"],
  },
];

export const tplById = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
