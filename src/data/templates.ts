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
  /** Typical risks, as events with a cause: [what could happen, category,
   *  why it could happen, consequence on [price, time, resources] 0-5]. */
  risks: [L10n, string, L10n, [number, number, number]][];
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
      [L("Key people are pulled onto other work", "Nøglepersoner trækkes over i andet arbejde"), "Organisational", L("The same people also run daily operations", "De samme personer driver også den daglige drift"), [0, 3, 4]],
      [L("Requirements change after the plan is agreed", "Kravene ændres, efter planen er aftalt"), "Organisational", L("The users were not involved early enough", "Brugerne blev ikke inddraget tidligt nok"), [3, 3, 2]],
      [L("A supplier delivers late", "En leverandør leverer for sent"), "External", L("The contract has no clear dates or penalties", "Kontrakten har ingen klare datoer eller bod"), [1, 4, 1]],
      [L("Estimates turn out too low", "Estimaterne viser sig at være for lave"), "Financial", L("The plan was made on too little information", "Planen blev lagt på for lidt viden"), [4, 3, 2]],
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
      [L("The building permit takes longer than planned", "Byggetilladelsen tager længere tid end planlagt"), "External", L("The application is incomplete, or the municipality is busy", "Ansøgningen er mangelfuld, eller kommunen har travlt"), [1, 4, 1]],
      [L("Steel and concrete prices rise before contracts are signed", "Priserne på stål og beton stiger, før kontrakterne er underskrevet"), "Financial", L("Prices are not fixed in the contracts", "Priserne er ikke fastlåst i kontrakterne"), [4, 1, 0]],
      [L("Unexpected soft or contaminated ground is found", "Der findes uventet blød eller forurenet jord"), "Technical", L("The ground has not been surveyed thoroughly", "Jorden er ikke undersøgt grundigt"), [4, 3, 1]],
      [L("The main contractor lacks crews or goes bankrupt", "Hovedentreprenøren mangler folk eller går konkurs"), "External", L("The contractor runs many projects at once on thin finances", "Entreprenøren kører mange projekter på én gang med en svag økonomi"), [3, 4, 4]],
      [L("Frost or heavy rain stops work on site", "Frost eller kraftig regn stopper arbejdet på pladsen"), "External", L("Critical work is planned for winter", "Kritisk arbejde er planlagt til vinteren"), [2, 3, 1]],
      [L("A serious accident happens on site", "Der sker en alvorlig ulykke på pladsen"), "Organisational", L("Safety rules are skipped under time pressure", "Sikkerhedsregler springes over under tidspres"), [2, 3, 3]],
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
      [L("New wishes are added during development", "Nye ønsker kommer til under udviklingen"), "Organisational", L("Scope is not frozen and there is no change process", "Scope er ikke låst, og der er ingen ændringsproces"), [3, 4, 3]],
      [L("Integrations with existing systems fail in test", "Integrationer til eksisterende systemer fejler i test"), "Technical", L("The old systems are poorly documented", "De gamle systemer er dårligt dokumenteret"), [2, 4, 3]],
      [L("Data is wrong or missing after migration", "Data er forkerte eller mangler efter migreringen"), "Technical", L("Data quality in the old system is unknown", "Datakvaliteten i det gamle system er ukendt"), [2, 3, 4]],
      [L("Personal data is exposed", "Persondata bliver eksponeret"), "Technical", L("Security is reviewed only at the end", "Sikkerheden gennemgås først til sidst"), [4, 2, 2]],
      [L("Users keep working the old way", "Brugerne bliver ved med at arbejde på den gamle måde"), "Organisational", L("Users were not trained or involved", "Brugerne blev ikke trænet eller inddraget"), [1, 2, 3]],
      [L("The vendor moves its consultants to other customers", "Leverandøren flytter sine konsulenter til andre kunder"), "External", L("The contract does not name the team", "Kontrakten navngiver ikke teamet"), [1, 4, 4]],
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
      [L("The message does not land with the audience", "Budskabet rammer ikke målgruppen"), "Commercial", L("The audience was not tested before launch", "Målgruppen blev ikke testet før lanceringen"), [3, 2, 1]],
      [L("Approval rounds take longer than planned", "Godkendelsesrunder tager længere tid end planlagt"), "Organisational", L("Too many people must approve, without clear roles", "For mange skal godkende, uden klare roller"), [1, 4, 2]],
      [L("Media prices rise in the campaign period", "Mediepriserne stiger i kampagneperioden"), "Financial", L("Media is booked late in a busy season", "Medier bookes sent i en travl sæson"), [4, 1, 0]],
      [L("Material uses images or music without the right licence", "Materialet bruger billeder eller musik uden den rette licens"), "External", L("Rights are not checked before production", "Rettigheder tjekkes ikke før produktion"), [3, 3, 1]],
      [L("The campaign draws negative reactions online", "Kampagnen får negative reaktioner online"), "Commercial", L("Sensitive topics were not reviewed", "Følsomme emner blev ikke vurderet"), [2, 2, 3]],
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
      [L("The core hypothesis turns out not to hold", "Kernehypotesen viser sig ikke at holde"), "Technical", L("Early experiments are too small to tell", "De første forsøg er for små til at vise det"), [3, 4, 3]],
      [L("Funding ends before results are ready", "Finansieringen slutter, før resultaterne er klar"), "Financial", L("The grant period is shorter than the research plan", "Bevillingsperioden er kortere end forskningsplanen"), [4, 3, 2]],
      [L("A key researcher leaves", "En nøgleforsker stopper"), "Organisational", L("Knowledge sits with one person", "Viden ligger hos én person"), [1, 3, 5]],
      [L("Ethics approval comes late", "Den etiske godkendelse kommer sent"), "External", L("The application is sent late", "Ansøgningen sendes sent"), [0, 4, 1]],
      [L("Results cannot be reproduced", "Resultaterne kan ikke genskabes"), "Technical", L("Methods and data are not documented as you go", "Metoder og data dokumenteres ikke løbende"), [2, 3, 3]],
      [L("Partners disagree on who owns the results", "Partnerne er uenige om, hvem der ejer resultaterne"), "External", L("IP rights are not agreed at the start", "Rettighederne er ikke aftalt fra starten"), [3, 2, 1]],
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
      [L("Too few people sign up", "For få tilmelder sig"), "Commercial", L("Promotion starts too late or misses the audience", "Markedsføringen starter for sent eller rammer forkert"), [3, 1, 1]],
      [L("A headline speaker cancels", "En hovedtaler melder afbud"), "External", L("Speakers have no contract or backup", "Talerne har ingen kontrakt eller afløser"), [2, 2, 2]],
      [L("Bad weather on the day", "Dårligt vejr på dagen"), "External", L("The event is outdoors without a plan B", "Arrangementet er udendørs uden en plan B"), [3, 1, 2]],
      [L("The venue or a key supplier does not deliver", "Lokationen eller en vigtig leverandør leverer ikke"), "External", L("Bookings are not confirmed in writing", "Bookinger er ikke bekræftet skriftligt"), [3, 3, 3]],
      [L("Crowding causes a safety incident", "Trængsel fører til en sikkerhedshændelse"), "Organisational", L("There is no crowd plan for peak times", "Der er ingen plan for trængsel i spidsbelastning"), [2, 1, 4]],
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
      [L("Key people resign", "Nøglemedarbejdere siger op"), "Organisational", L("They are unsure about their future roles", "De er usikre på deres fremtidige roller"), [2, 3, 5]],
      [L("Managers do not back the change", "Lederne bakker ikke op om forandringen"), "Organisational", L("They were not involved in the design", "De blev ikke inddraget i designet"), [1, 4, 3]],
      [L("The legal consultation must be redone", "Den lovpligtige høring skal gøres om"), "External", L("Unions are informed too late", "Fagforeningerne informeres for sent"), [2, 4, 2]],
      [L("Daily work suffers during the transition", "Det daglige arbejde lider under overgangen"), "Organisational", L("There is no plan for who covers which tasks", "Der er ingen plan for, hvem der dækker hvilke opgaver"), [2, 2, 4]],
      [L("News leaks before the announcement", "Nyheden slipper ud før offentliggørelsen"), "Organisational", L("Too many know before the plan is final", "For mange kender planen, før den er endelig"), [1, 2, 3]],
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
      [L("Daily operations are disrupted during the change", "Den daglige drift forstyrres under forandringen"), "Commercial", L("Changes are made in peak season", "Ændringer laves i højsæsonen"), [3, 2, 4]],
      [L("Staff slide back to old habits", "Medarbejderne glider tilbage til gamle vaner"), "Organisational", L("There is no follow-up after the rollout", "Der er ingen opfølgning efter udrulningen"), [2, 2, 3]],
      [L("Savings are smaller than expected", "Besparelserne bliver mindre end forventet"), "Financial", L("The baseline was measured on poor data", "Udgangspunktet blev målt på dårlige data"), [4, 1, 1]],
      [L("A supplier cannot adapt to the new process", "En leverandør kan ikke tilpasse sig den nye proces"), "External", L("Suppliers were not consulted", "Leverandørerne blev ikke spurgt"), [2, 3, 2]],
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
      [L("A competitor launches first", "En konkurrent lancerer først"), "Commercial", L("Development takes longer than the market window", "Udviklingen tager længere tid end markedsvinduet"), [3, 4, 1]],
      [L("Unit cost ends above target", "Stykprisen ender over målet"), "Financial", L("Components are chosen before costs are checked", "Komponenter vælges, før priserne er tjekket"), [4, 1, 1]],
      [L("Certification fails at the first attempt", "Certificeringen fejler i første forsøg"), "External", L("Requirements are checked only at the end", "Kravene tjekkes først til sidst"), [3, 4, 2]],
      [L("The supplier cannot produce enough units", "Leverandøren kan ikke producere nok enheder"), "External", L("Only one supplier is qualified", "Kun én leverandør er godkendt"), [2, 4, 2]],
      [L("Quality problems appear in the first batch", "Der opstår kvalitetsproblemer i første batch"), "Technical", L("The production line is not tested at full speed", "Produktionslinjen er ikke testet ved fuld hastighed"), [3, 3, 3]],
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
      [L("Participants cannot be released from work", "Deltagerne kan ikke frigøres fra arbejdet"), "Organisational", L("Training is planned in busy periods", "Træningen er planlagt i travle perioder"), [1, 3, 4]],
      [L("The content does not match real needs", "Indholdet passer ikke til de reelle behov"), "Organisational", L("No needs analysis was done with the participants", "Der blev ikke lavet en behovsanalyse med deltagerne"), [2, 2, 3]],
      [L("A trainer drops out", "En underviser falder fra"), "External", L("There is only one trainer per module", "Der er kun én underviser pr. modul"), [1, 3, 3]],
      [L("Learning is not used afterwards", "Det lærte bliver ikke brugt bagefter"), "Organisational", L("Managers do not follow up", "Lederne følger ikke op"), [2, 1, 2]],
      [L("The learning platform fails", "Læringsplatformen svigter"), "Technical", L("The platform is not tested with real users", "Platformen er ikke testet med rigtige brugere"), [2, 2, 2]],
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
      [L("Political priorities change mid-project", "De politiske prioriteter ændrer sig undervejs"), "External", L("The project spans an election", "Projektet strækker sig over et valg"), [3, 3, 3]],
      [L("Funding is not renewed", "Finansieringen bliver ikke forlænget"), "Financial", L("Results are not documented for funders", "Resultater dokumenteres ikke over for bevillingsgiverne"), [5, 2, 2]],
      [L("Few citizens or members take part", "Få borgere eller medlemmer deltager"), "Commercial", L("The target group was not involved in the design", "Målgruppen blev ikke inddraget i designet"), [1, 2, 2]],
      [L("Procurement takes longer than planned", "Udbuddet tager længere tid end planlagt"), "External", L("The procurement route is chosen late", "Udbudsformen vælges sent"), [1, 4, 2]],
      [L("Volunteers drop out", "Frivillige falder fra"), "Organisational", L("Tasks and recognition are unclear", "Opgaver og anerkendelse er uklare"), [1, 2, 4]],
      [L("The press covers the project negatively", "Pressen omtaler projektet negativt"), "External", L("There is no plan for answering critical questions", "Der er ingen plan for at svare på kritiske spørgsmål"), [1, 2, 2]],
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
      [L("New rules take effect earlier than expected", "De nye regler træder i kraft tidligere end ventet"), "External", L("The timeline depends on the regulator", "Tidsplanen afhænger af myndigheden"), [2, 4, 3]],
      [L("The requirements are interpreted wrongly", "Kravene fortolkes forkert"), "External", L("There is no legal review of the interpretation", "Der er ingen juridisk gennemgang af fortolkningen"), [3, 3, 2]],
      [L("Reports are built on poor data", "Rapporterne bygger på dårlige data"), "Technical", L("Source systems are not cleaned up", "Kildesystemerne er ikke ryddet op"), [2, 3, 3]],
      [L("The business does not follow the new controls", "Forretningen følger ikke de nye kontroller"), "Organisational", L("Controls are seen as paperwork", "Kontrollerne opfattes som papirarbejde"), [3, 1, 2]],
      [L("External advisers become a bottleneck", "Eksterne rådgivere bliver en flaskehals"), "External", L("Advisers are booked late", "Rådgiverne bookes sent"), [3, 3, 2]],
    ],
    decisions: [L("Interpretation of the requirements", "Fortolkning af kravene"), L("Build in-house or use advisers", "Løs selv eller brug rådgivere"), L("Who owns each control", "Hvem der ejer hver kontrol"), L("Sign-off for submission", "Godkendelse før indsendelse")],
    tools: ["riskanalysis", "decisions", "raci", "issues", "schedule"],
  },
];

/** Types from earlier versions, mapped to the broad category they belong to. */
const ALIASES: Record<string, string> = { erp: "it", app: "it", reorg: "org", move: "operations" };

export const tplById = (id: string) => TEMPLATES.find((t) => t.id === (ALIASES[id] ?? id)) ?? TEMPLATES[0];
