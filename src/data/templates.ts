import type { L10n } from "../model/types";
import { L } from "./catalog";

/** A project type: a broad category whose typical phases, stakeholders,
 *  risks and decisions are suggested when a project is set up. Everything
 *  it suggests can be changed. */
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
  /** Add-on tools that usually pay off for this kind of project. */
  tools: string[];
}

type G = [L10n, string, "Internal" | "External"];
const I = "Internal", E = "External";

export const TEMPLATES: Template[] = [
  {
    id: "general",
    name: L("General project", "Generelt projekt"),
    desc: L("Any project. Start with the basics and add what you need.", "Alle slags projekter. Start med det grundlæggende, og tilføj det du har brug for."),
    phases: [
      [L("Start", "Start"), L("Project approved", "Projekt godkendt")],
      [L("Plan", "Planlæg"), L("Plan approved", "Plan godkendt")],
      [L("Deliver", "Gennemfør"), L("Result accepted", "Resultat godkendt")],
      [L("Close", "Afslut"), L("Project closed", "Projekt afsluttet")],
    ],
    groups: [
      [L("Project sponsor", "Projektejer"), "Internal", I],
      [L("Management", "Ledelse"), "Internal", I],
      [L("Users", "Brugere"), "Internal", I],
      [L("Customers", "Kunder"), "Customers", E],
      [L("Suppliers", "Leverandører"), "Partners", E],
    ] as G[],
    risks: [
      [L("Deadline slips", "Tidsplanen skrider"), "Organisational"],
      [L("Budget overrun", "Budgetoverskridelse"), "Financial"],
      [L("Key people unavailable", "Nøglepersoner er ikke til rådighed"), "Organisational"],
      [L("Unclear or changing requirements", "Uklare eller skiftende krav"), "Organisational"],
    ],
    decisions: [L("Go / no-go to start", "Go / no-go for start"), L("Approve the plan", "Godkend planen"), L("Accept the result", "Godkend resultatet")],
    tools: ["issues", "decisions", "schedule", "board"],
  },
  {
    id: "construction",
    name: L("Construction & Engineering", "Byggeri og anlæg"),
    desc: L("Buildings, infrastructure, installations and technical works.", "Bygninger, infrastruktur, installationer og tekniske anlæg."),
    phases: [
      [L("Feasibility", "Forundersøgelse"), L("Business case and site approved", "Business case og grund godkendt")],
      [L("Design", "Projektering"), L("Design and permits approved", "Projekt og tilladelser godkendt")],
      [L("Tender", "Udbud"), L("Contractors signed", "Entreprenører kontraheret")],
      [L("Build", "Udførelse"), L("Practical completion", "Aflevering")],
      [L("Handover", "Ibrugtagning"), L("One-year inspection passed", "1-årsgennemgang bestået")],
    ],
    groups: [
      [L("Client / building owner", "Bygherre"), "Internal", I],
      [L("Architect and engineers", "Arkitekt og ingeniører"), "Partners", E],
      [L("Main contractor", "Hovedentreprenør"), "Partners", E],
      [L("Subcontractors", "Underentreprenører"), "Partners", E],
      [L("Municipality / building authority", "Kommune / byggemyndighed"), "Authorities & reps", E],
      [L("Neighbours", "Naboer"), "Authorities & reps", E],
      [L("Future users", "Kommende brugere"), "Internal", I],
    ] as G[],
    risks: [
      [L("Permit or approval delayed", "Tilladelse eller godkendelse forsinkes"), "External"],
      [L("Material prices rise", "Materialepriser stiger"), "Financial"],
      [L("Ground conditions or contamination", "Jordbundsforhold eller forurening"), "Technical"],
      [L("Contractor capacity or insolvency", "Entreprenørens kapacitet eller konkurs"), "External"],
      [L("Weather delays", "Vejrlig forsinker arbejdet"), "External"],
      [L("Safety incident on site", "Arbejdsulykke på pladsen"), "Organisational"],
    ],
    decisions: [L("Choice of site", "Valg af grund"), L("Contract form (turnkey, main or trade contracts)", "Entrepriseform (total-, hoved- eller fagentreprise)"), L("Design freeze", "Projektet låses"), L("Contractor selection", "Valg af entreprenør"), L("Accept handover", "Godkend aflevering")],
    tools: ["schedule", "budget", "wbs", "issues", "decisions", "changes"],
  },
  {
    id: "it",
    name: L("IT & Software Development", "IT og softwareudvikling"),
    desc: L("New systems, apps, integrations and rollouts of IT solutions.", "Nye systemer, apps, integrationer og udrulning af IT-løsninger."),
    phases: [
      [L("Discover", "Afdæk"), L("Problem and scope agreed", "Problem og scope aftalt")],
      [L("Design", "Design"), L("Solution design approved", "Løsningsdesign godkendt")],
      [L("Build", "Udvikl"), L("Feature complete", "Funktionaliteten er færdig")],
      [L("Test & migrate", "Test og migrering"), L("Go / no-go for go-live", "Go / no-go for idriftsættelse")],
      [L("Go-live", "Idriftsættelse"), L("Handover to operations", "Overdragelse til drift")],
    ],
    groups: [
      [L("Product owner", "Produktejer"), "Internal", I],
      [L("Development team", "Udviklingsteam"), "Internal", I],
      [L("IT operations", "IT-drift"), "Internal", I],
      [L("End users", "Slutbrugere"), "Internal", I],
      [L("Vendor or supplier", "Leverandør"), "Partners", E],
      [L("Information security / data protection", "Informationssikkerhed / databeskyttelse"), "Authorities & reps", I],
      [L("Customers", "Kunder"), "Customers", E],
    ] as G[],
    risks: [
      [L("Scope creep", "Scope vokser ukontrolleret"), "Organisational"],
      [L("Integrations fail in test", "Integrationer fejler i test"), "Technical"],
      [L("Data migration errors", "Fejl i datamigrering"), "Technical"],
      [L("Security or privacy breach", "Brud på sikkerhed eller persondata"), "Technical"],
      [L("Low user adoption", "Lav brugeradoption"), "Organisational"],
      [L("Vendor delivers late", "Leverandøren leverer for sent"), "External"],
    ],
    decisions: [L("Buy standard system or build", "Købe standardsystem eller udvikle selv"), L("Which vendor or platform", "Valg af leverandør eller platform"), L("Big bang or phased go-live", "Big bang eller faseopdelt idriftsættelse"), L("Which integrations go live on day one", "Hvilke integrationer går live på dag ét"), L("Which data to migrate or archive", "Hvilke data der migreres eller arkiveres"), L("Go / no-go for go-live", "Go / no-go for idriftsættelse")],
    tools: ["issues", "decisions", "board", "schedule", "riskanalysis", "raci"],
  },
  {
    id: "marketing",
    name: L("Marketing & Creative", "Marketing og kreativt"),
    desc: L("Campaigns, brands, content, websites and communication.", "Kampagner, brands, indhold, hjemmesider og kommunikation."),
    phases: [
      [L("Brief", "Brief"), L("Brief and goals approved", "Brief og mål godkendt")],
      [L("Concept", "Koncept"), L("Concept chosen", "Koncept valgt")],
      [L("Production", "Produktion"), L("Final material approved", "Endeligt materiale godkendt")],
      [L("Launch", "Lancering"), L("Campaign live", "Kampagnen er live")],
      [L("Evaluate", "Evaluér"), L("Results reported", "Resultater afrapporteret")],
    ],
    groups: [
      [L("Marketing manager", "Marketingchef"), "Internal", I],
      [L("Brand owner / management", "Brandansvarlig / ledelse"), "Internal", I],
      [L("Agency or freelancers", "Bureau eller freelancere"), "Partners", E],
      [L("Target audience", "Målgruppe"), "Customers", E],
      [L("Sales team", "Salgsteam"), "Internal", I],
      [L("Media and platforms", "Medier og platforme"), "Partners", E],
    ] as G[],
    risks: [
      [L("Message misses the audience", "Budskabet rammer ved siden af målgruppen"), "Commercial"],
      [L("Approval rounds delay launch", "Godkendelsesrunder forsinker lanceringen"), "Organisational"],
      [L("Media budget runs out early", "Mediebudgettet slipper op for tidligt"), "Financial"],
      [L("Rights or legal issues with content", "Rettigheder eller jura i indholdet"), "External"],
      [L("Negative reactions on social media", "Negative reaktioner på sociale medier"), "Commercial"],
    ],
    decisions: [L("Target audience and goal", "Målgruppe og mål"), L("Choice of agency", "Valg af bureau"), L("Concept", "Koncept"), L("Channel and media mix", "Kanaler og mediemix"), L("Launch date", "Lanceringsdato")],
    tools: ["schedule", "budget", "board", "decisions", "comms"],
  },
  {
    id: "rnd",
    name: L("Research & Development", "Forskning og udvikling"),
    desc: L("Studies, experiments, prototypes and new technology.", "Undersøgelser, forsøg, prototyper og ny teknologi."),
    phases: [
      [L("Idea", "Idé"), L("Hypothesis and funding approved", "Hypotese og finansiering godkendt")],
      [L("Research", "Forskning"), L("Findings reviewed", "Resultater vurderet")],
      [L("Prototype", "Prototype"), L("Prototype works", "Prototypen virker")],
      [L("Validate", "Valider"), L("Validated with users or tests", "Valideret med brugere eller test")],
      [L("Transfer", "Overførsel"), L("Handed over to product or published", "Overdraget til produkt eller publiceret")],
    ],
    groups: [
      [L("Research lead", "Forskningsleder"), "Internal", I],
      [L("Research team", "Forskerteam"), "Internal", I],
      [L("Funding body or investors", "Bevillingsgiver eller investorer"), "Investors", E],
      [L("Academic partners", "Akademiske partnere"), "Partners", E],
      [L("Ethics or approval board", "Etisk komité eller godkendelsesorgan"), "Authorities & reps", E],
      [L("Future users", "Kommende brugere"), "Customers", E],
    ] as G[],
    risks: [
      [L("Hypothesis does not hold", "Hypotesen holder ikke"), "Technical"],
      [L("Funding ends before results", "Finansieringen slutter før resultaterne"), "Financial"],
      [L("Key researcher leaves", "Nøgleforsker stopper"), "Organisational"],
      [L("Ethics or regulatory approval delayed", "Etisk eller regulatorisk godkendelse forsinkes"), "External"],
      [L("Results cannot be reproduced", "Resultaterne kan ikke genskabes"), "Technical"],
      [L("Intellectual property dispute", "Uenighed om rettigheder og IP"), "External"],
    ],
    decisions: [L("Research question", "Forskningsspørgsmål"), L("Method and setup", "Metode og forsøgsopstilling"), L("Continue, change direction or stop", "Fortsæt, skift retning eller stop"), L("Patent or publish", "Patentér eller publicér"), L("Hand over to product", "Overdrag til produkt")],
    tools: ["decisions", "riskanalysis", "schedule", "budget", "lessons"],
  },
  {
    id: "event",
    name: L("Event planning", "Eventplanlægning"),
    desc: L("Conferences, festivals, launches, meetings and celebrations.", "Konferencer, festivaler, lanceringer, møder og arrangementer."),
    phases: [
      [L("Concept", "Koncept"), L("Concept and budget approved", "Koncept og budget godkendt")],
      [L("Book", "Book"), L("Venue and key suppliers booked", "Sted og vigtige leverandører booket")],
      [L("Promote", "Markedsfør"), L("Registration open", "Tilmelding åben")],
      [L("Event", "Afvikling"), L("Event held", "Arrangementet er afholdt")],
      [L("Follow up", "Opfølgning"), L("Evaluation done", "Evaluering gennemført")],
    ],
    groups: [
      [L("Event owner / host", "Arrangør / vært"), "Internal", I],
      [L("Guests and participants", "Gæster og deltagere"), "Customers", E],
      [L("Speakers or performers", "Talere eller optrædende"), "Partners", E],
      [L("Venue", "Lokation"), "Partners", E],
      [L("Catering and suppliers", "Catering og leverandører"), "Partners", E],
      [L("Sponsors", "Sponsorer"), "Investors", E],
      [L("Police, fire and permits", "Politi, brandvæsen og tilladelser"), "Authorities & reps", E],
    ] as G[],
    risks: [
      [L("Too few registrations", "For få tilmeldinger"), "Commercial"],
      [L("Speaker or performer cancels", "Taler eller optrædende melder afbud"), "External"],
      [L("Bad weather", "Dårligt vejr"), "External"],
      [L("Venue or supplier fails", "Lokation eller leverandør svigter"), "External"],
      [L("Safety or crowd incident", "Sikkerhedshændelse blandt deltagere"), "Organisational"],
      [L("Costs above budget", "Udgifter over budget"), "Financial"],
    ],
    decisions: [L("Date and venue", "Dato og sted"), L("Ticket price or free entry", "Billetpris eller gratis adgang"), L("Programme", "Program"), L("Go / no-go given weather or sign-ups", "Go / no-go ud fra vejr eller tilmeldinger")],
    tools: ["schedule", "budget", "board", "comms", "issues"],
  },
  {
    id: "org",
    name: L("Organisational change & HR", "Organisationsforandring og HR"),
    desc: L("Restructuring, mergers, new ways of working and culture.", "Omstruktureringer, fusioner, nye arbejdsformer og kultur."),
    phases: [
      [L("Diagnose", "Diagnose"), L("Case for change agreed", "Behovet for forandring er aftalt")],
      [L("Design", "Design"), L("Target organisation approved", "Målorganisation godkendt")],
      [L("Consult", "Høring"), L("Consultation concluded", "Høring afsluttet")],
      [L("Implement", "Gennemfør"), L("New organisation in force", "Ny organisation trådt i kraft")],
      [L("Embed", "Forankr"), L("Review after six months", "Evaluering efter seks måneder")],
    ],
    groups: [
      [L("Board and top management", "Bestyrelse og topledelse"), "Investors", I],
      [L("Middle managers", "Mellemledere"), "Internal", I],
      [L("Employees", "Medarbejdere"), "Internal", I],
      [L("Unions / works council", "Fagforeninger / samarbejdsudvalg"), "Authorities & reps", I],
      [L("HR", "HR"), "Internal", I],
      [L("Customers", "Kunder"), "Customers", E],
    ] as G[],
    risks: [
      [L("Loss of key people", "Tab af nøglemedarbejdere"), "Organisational"],
      [L("Resistance to the change", "Modstand mod forandringen"), "Organisational"],
      [L("Errors in the legal consultation", "Fejl i den lovpligtige høring"), "External"],
      [L("Productivity dips during the change", "Produktiviteten falder under forandringen"), "Organisational"],
      [L("Rumours before announcement", "Rygter før offentliggørelse"), "Organisational"],
    ],
    decisions: [L("Scope of the change", "Forandringens omfang"), L("Selection criteria for roles", "Udvælgelseskriterier til roller"), L("Announcement date and channel", "Dato og kanal for offentliggørelse"), L("Terms for those affected", "Vilkår for de berørte")],
    tools: ["stakeholders", "engagement", "comms", "raci", "decisions"],
  },
  {
    id: "operations",
    name: L("Operations & Process improvement", "Drift og procesforbedring"),
    desc: L("Better, cheaper or safer ways of working: logistics, production, facilities and moves.", "Bedre, billigere eller sikrere arbejdsgange: logistik, produktion, faciliteter og flytninger."),
    phases: [
      [L("Measure", "Mål"), L("Baseline agreed", "Udgangspunkt aftalt")],
      [L("Analyse", "Analysér"), L("Root causes found", "Årsager fundet")],
      [L("Improve", "Forbedr"), L("Pilot succeeded", "Pilot lykkedes")],
      [L("Roll out", "Udrul"), L("Running everywhere", "Kører overalt")],
      [L("Sustain", "Fasthold"), L("Gains confirmed", "Gevinster bekræftet")],
    ],
    groups: [
      [L("Process owner", "Procesejer"), "Internal", I],
      [L("Frontline staff", "Medarbejdere i driften"), "Internal", I],
      [L("Management", "Ledelse"), "Internal", I],
      [L("Suppliers and logistics partners", "Leverandører og logistikpartnere"), "Partners", E],
      [L("Customers", "Kunder"), "Customers", E],
      [L("Health and safety", "Arbejdsmiljø"), "Authorities & reps", I],
    ] as G[],
    risks: [
      [L("Daily operations disrupted during the change", "Driften forstyrres under forandringen"), "Commercial"],
      [L("Staff return to old habits", "Medarbejdere vender tilbage til gamle vaner"), "Organisational"],
      [L("Savings smaller than expected", "Besparelser mindre end forventet"), "Financial"],
      [L("Poor data for the baseline", "Dårlige data til udgangspunktet"), "Technical"],
      [L("Supplier cannot adapt", "Leverandøren kan ikke tilpasse sig"), "External"],
    ],
    decisions: [L("Which process to improve first", "Hvilken proces der forbedres først"), L("Pilot site or team", "Pilotsted eller team"), L("Roll out or adjust", "Udrul eller justér"), L("New standard approved", "Ny standard godkendt")],
    tools: ["board", "schedule", "budget", "benefits", "lessons"],
  },
  {
    id: "product",
    name: L("Product launch", "Produktlancering"),
    desc: L("Bringing a new physical or digital product or service to market.", "Bring et nyt fysisk eller digitalt produkt eller en ny service på markedet."),
    phases: [
      [L("Concept", "Koncept"), L("Concept approved", "Koncept godkendt")],
      [L("Develop", "Udvikl"), L("Design frozen", "Design låst")],
      [L("Validate", "Valider"), L("Tests and certification passed", "Test og certificering bestået")],
      [L("Prepare launch", "Klargør lancering"), L("Sales and supply ready", "Salg og forsyning klar")],
      [L("Launch", "Lancér"), L("On the market", "På markedet")],
    ],
    groups: [
      [L("Product manager", "Produktchef"), "Internal", I],
      [L("Development / engineering", "Udvikling"), "Internal", I],
      [L("Sales and marketing", "Salg og marketing"), "Internal", I],
      [L("Suppliers and manufacturers", "Leverandører og producenter"), "Partners", E],
      [L("Retailers or distributors", "Forhandlere eller distributører"), "Customers", E],
      [L("End customers", "Slutkunder"), "Customers", E],
      [L("Investors", "Investorer"), "Investors", E],
    ] as G[],
    risks: [
      [L("Competitor launches first", "Konkurrent lancerer først"), "Commercial"],
      [L("Unit cost above target", "Stykpris over mål"), "Financial"],
      [L("Certification or approval fails", "Certificering eller godkendelse fejler"), "External"],
      [L("Supplier capacity too low", "For lav kapacitet hos leverandøren"), "External"],
      [L("Quality problems in the first batch", "Kvalitetsproblemer i første batch"), "Technical"],
    ],
    decisions: [L("Target price", "Målpris"), L("Make or buy components", "Producere selv eller købe komponenter"), L("Launch markets and channels", "Lanceringsmarkeder og kanaler"), L("Launch date", "Lanceringsdato")],
    tools: ["schedule", "budget", "decisions", "swot", "benefits"],
  },
  {
    id: "education",
    name: L("Education & Training", "Uddannelse og kompetenceudvikling"),
    desc: L("Courses, training programmes, onboarding and learning platforms.", "Kurser, uddannelsesforløb, onboarding og læringsplatforme."),
    phases: [
      [L("Needs analysis", "Behovsanalyse"), L("Learning goals agreed", "Læringsmål aftalt")],
      [L("Design", "Design"), L("Programme designed", "Forløb designet")],
      [L("Develop", "Udvikl"), L("Material ready", "Materiale klar")],
      [L("Deliver", "Gennemfør"), L("Participants trained", "Deltagere uddannet")],
      [L("Evaluate", "Evaluér"), L("Effect measured", "Effekt målt")],
    ],
    groups: [
      [L("Programme owner", "Forløbsejer"), "Internal", I],
      [L("Participants", "Deltagere"), "Customers", I],
      [L("Their managers", "Deltagernes ledere"), "Internal", I],
      [L("Trainers or teachers", "Undervisere"), "Partners", E],
      [L("HR / learning department", "HR / læringsafdeling"), "Internal", I],
      [L("Accreditation body", "Akkrediteringsorgan"), "Authorities & reps", E],
    ] as G[],
    risks: [
      [L("Participants cannot be released from work", "Deltagere kan ikke frigøres fra arbejdet"), "Organisational"],
      [L("Content does not match real needs", "Indholdet passer ikke til de reelle behov"), "Organisational"],
      [L("Trainer unavailable", "Underviser ikke til rådighed"), "External"],
      [L("Learning not used afterwards", "Det lærte bliver ikke brugt bagefter"), "Organisational"],
      [L("Platform or technical problems", "Platform eller tekniske problemer"), "Technical"],
    ],
    decisions: [L("Target group", "Målgruppe"), L("Format: classroom, online or blended", "Form: fremmøde, online eller blandet"), L("Internal or external trainers", "Interne eller eksterne undervisere"), L("How effect is measured", "Hvordan effekten måles")],
    tools: ["schedule", "board", "comms", "benefits", "lessons"],
  },
  {
    id: "public",
    name: L("Public sector & Non-profit", "Offentlig og frivillig sektor"),
    desc: L("Public services, policy, grants, communities and NGOs.", "Offentlige ydelser, politik, puljer, lokalsamfund og NGO'er."),
    phases: [
      [L("Mandate", "Mandat"), L("Political or board mandate given", "Politisk mandat eller bestyrelsesmandat givet")],
      [L("Plan & fund", "Planlæg og finansiér"), L("Funding secured", "Finansiering sikret")],
      [L("Consult", "Høring"), L("Consultation concluded", "Høring afsluttet")],
      [L("Implement", "Gennemfør"), L("Service or initiative running", "Ydelse eller indsats i gang")],
      [L("Report", "Afrapportér"), L("Results reported to funders", "Resultater afrapporteret til bevillingsgivere")],
    ],
    groups: [
      [L("Politicians or board", "Politikere eller bestyrelse"), "Investors", E],
      [L("Administration", "Forvaltning"), "Internal", I],
      [L("Citizens or members", "Borgere eller medlemmer"), "Customers", E],
      [L("Volunteers", "Frivillige"), "Internal", I],
      [L("Funders and foundations", "Bevillingsgivere og fonde"), "Investors", E],
      [L("Partner organisations", "Samarbejdspartnere"), "Partners", E],
      [L("Press", "Presse"), "Authorities & reps", E],
    ] as G[],
    risks: [
      [L("Political priorities change", "Politiske prioriteter ændrer sig"), "External"],
      [L("Funding not renewed", "Finansieringen bliver ikke forlænget"), "Financial"],
      [L("Low uptake among citizens or members", "Lav tilslutning blandt borgere eller medlemmer"), "Commercial"],
      [L("Procurement rules delay purchases", "Udbudsregler forsinker indkøb"), "External"],
      [L("Volunteers drop out", "Frivillige falder fra"), "Organisational"],
      [L("Negative press coverage", "Negativ omtale i pressen"), "External"],
    ],
    decisions: [L("Scope of the mandate", "Mandatets omfang"), L("Which grants to apply for", "Hvilke puljer der søges"), L("Procurement route", "Udbudsform"), L("Continue after the pilot", "Fortsæt efter pilotperioden")],
    tools: ["stakeholders", "comms", "budget", "decisions", "benefits"],
  },
  {
    id: "finance",
    name: L("Finance, Legal & Compliance", "Økonomi, jura og compliance"),
    desc: L("Audits, new regulation, mergers and acquisitions, and financial systems.", "Revision, ny lovgivning, opkøb og fusioner samt økonomisystemer."),
    phases: [
      [L("Assess", "Vurdér"), L("Requirements and gaps known", "Krav og mangler kendt")],
      [L("Plan", "Planlæg"), L("Approach approved", "Tilgang godkendt")],
      [L("Implement", "Gennemfør"), L("Controls and processes in place", "Kontroller og processer på plads")],
      [L("Verify", "Verificér"), L("Audit or review passed", "Revision eller gennemgang bestået")],
      [L("Maintain", "Vedligehold"), L("Owned by the line", "Forankret i linjen")],
    ],
    groups: [
      [L("CFO or legal counsel", "Økonomidirektør eller juridisk ansvarlig"), "Internal", I],
      [L("Finance team", "Økonomiafdeling"), "Internal", I],
      [L("Business units affected", "Berørte forretningsområder"), "Internal", I],
      [L("External auditor", "Ekstern revisor"), "Authorities & reps", E],
      [L("Regulator or authority", "Tilsyn eller myndighed"), "Authorities & reps", E],
      [L("Advisers", "Rådgivere"), "Partners", E],
      [L("Owners or board", "Ejere eller bestyrelse"), "Investors", E],
    ] as G[],
    risks: [
      [L("Deadline from the regulator is missed", "Myndighedens frist overskrides"), "External"],
      [L("Requirements interpreted wrongly", "Kravene fortolkes forkert"), "External"],
      [L("Fines or sanctions", "Bøder eller sanktioner"), "Financial"],
      [L("Data quality too low for reporting", "For dårlig datakvalitet til rapportering"), "Technical"],
      [L("Business sees it as paperwork and does not comply", "Forretningen ser det som papirarbejde og efterlever det ikke"), "Organisational"],
    ],
    decisions: [L("Interpretation of the requirements", "Fortolkning af kravene"), L("Build in-house or use advisers", "Løs selv eller brug rådgivere"), L("Who owns each control", "Hvem der ejer hver kontrol"), L("Sign-off for submission", "Godkendelse før indsendelse")],
    tools: ["riskanalysis", "decisions", "raci", "issues", "schedule"],
  },
];

/** Types from earlier versions, mapped to the broad category they belong to. */
const ALIASES: Record<string, string> = { erp: "it", app: "it", reorg: "org", move: "operations" };

export const tplById = (id: string) => TEMPLATES.find((t) => t.id === (ALIASES[id] ?? id)) ?? TEMPLATES[0];
