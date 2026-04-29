import type {
  Agency,
  Bolo,
  LookupTab,
  MdtCall,
  OfficerModule,
  PenalCodeEntry,
  PolicyEntry,
  UnitRosterEntry,
  UnitStatus,
  UnitType,
} from "./types";

// Temporary mock data. Replace with Supabase/FiveM live data later.

export const agencyOptions: Agency[] = ["Law Enforcement", "Fire", "EMS", "Tow"];

export const agencyUnitTypes: Record<Agency, UnitType[]> = {
  "Law Enforcement": ["Patrol", "Supervisor", "K9", "SWAT", "Traffic"],
  Fire: ["Engine", "Ladder", "Rescue", "Battalion", "Brush"],
  EMS: ["Medic", "Ambulance", "Supervisor", "Air Medical"],
  Tow: ["Flatbed", "Heavy", "Standard"],
};

export const officerModules: Array<{
  agencies: Agency[];
  id: OfficerModule;
  label: string;
  priority?: "primary" | "muted";
}> = [
  { agencies: agencyOptions, id: "home", label: "Home", priority: "primary" },
  { agencies: agencyOptions, id: "active-calls", label: "Active Calls", priority: "primary" },
  { agencies: agencyOptions, id: "my-status", label: "My Status", priority: "primary" },
  { agencies: agencyOptions, id: "lookups", label: "Lookups", priority: "primary" },
  { agencies: agencyOptions, id: "reports", label: "Reports", priority: "primary" },
  { agencies: ["Law Enforcement"], id: "citations", label: "Citations" },
  { agencies: ["Law Enforcement"], id: "arrests", label: "Arrests" },
  { agencies: ["Law Enforcement"], id: "warrants", label: "Warrants" },
  { agencies: ["Law Enforcement"], id: "bolos", label: "BOLOs" },
  { agencies: ["Law Enforcement"], id: "penal-code", label: "Penal Code" },
  { agencies: agencyOptions, id: "department-policies", label: "Department Policies" },
  { agencies: agencyOptions, id: "supervisor-panel", label: "Supervisor Panel" },
  { agencies: agencyOptions, id: "panic", label: "Panic / Emergency", priority: "primary" },
  { agencies: agencyOptions, id: "settings", label: "Settings", priority: "muted" },
];

export const statusOptions: Record<Agency, UnitStatus[]> = {
  "Law Enforcement": [
    "Available",
    "Enroute",
    "On Scene",
    "Busy",
    "Traffic Stop",
    "Transporting",
    "At Station",
    "Out of Service",
    "Panic",
  ],
  Fire: ["Available", "Enroute", "On Scene", "Busy", "Staging", "Rehab", "At Station", "Out of Service", "Panic"],
  EMS: [
    "Available",
    "Enroute",
    "On Scene",
    "Busy",
    "Transporting",
    "At Hospital",
    "Staging",
    "At Station",
    "Out of Service",
    "Panic",
  ],
  Tow: ["Available", "Enroute", "On Scene", "Busy", "Transporting", "At Station", "Out of Service", "Panic"],
};

export const quickStatusButtons: UnitStatus[] = ["Available", "Enroute", "On Scene", "Busy", "Out of Service", "Panic"];

export const lookupTabs: LookupTab[] = ["Name", "License", "Plate", "Vehicle", "Weapon", "Warrant", "BOLO"];

export const activeCalls: MdtCall[] = [
  {
    address: "Alta St / Power St, Postal 218",
    age: "04m",
    callNumber: "C-2026-0148",
    details: "Caller reports shots heard from a dark sedan leaving the area northbound.",
    id: "call-148",
    incidentType: "Shots Fired",
    notes: ["Dispatcher advised caller is sheltering inside.", "Possible black Schafter, partial 29Y."],
    priority: "Critical",
    serviceType: "Law Enforcement",
    status: "Assigned",
    units: ["2L-14", "2K-9"],
  },
  {
    address: "Vespucci Blvd / Elgin Ave, Postal 306",
    age: "11m",
    callNumber: "C-2026-0146",
    details: "Two vehicle collision, one party complaining of neck pain. Fire and EMS requested.",
    id: "call-146",
    incidentType: "Traffic Collision",
    notes: ["Roadway partially blocked.", "Tow rotation requested after scene safety."],
    priority: "High",
    serviceType: "Multi-agency",
    status: "Enroute",
    units: ["2T-22", "E-7", "M-4"],
  },
  {
    address: "Sandy Shores Fire Station, Postal 903",
    age: "17m",
    callNumber: "C-2026-0142",
    details: "Commercial alarm activation with smoke showing from side C.",
    id: "call-142",
    incidentType: "Structure Fire",
    notes: ["Hydrant map pending live CAD integration.", "Battalion requested staging channel."],
    priority: "Critical",
    serviceType: "Fire",
    status: "On Scene",
    units: ["E-7", "L-2", "B-1"],
  },
  {
    address: "Pillbox Medical Center, Postal 301",
    age: "08m",
    callNumber: "C-2026-0144",
    details: "Patient transport from scene to Pillbox. Hospital arrival pending.",
    id: "call-144",
    incidentType: "Medical Transport",
    notes: ["Patient contact form placeholder opened.", "Awaiting hospital handoff workflow."],
    priority: "Medium",
    serviceType: "EMS",
    status: "Transporting" as MdtCall["status"],
    units: ["M-4"],
  },
  {
    address: "Popular St Impound Yard, Postal 375",
    age: "23m",
    callNumber: "C-2026-0139",
    details: "Disabled vehicle blocking commercial driveway. Owner unavailable.",
    id: "call-139",
    incidentType: "Tow Request",
    notes: ["Vehicle handling and impound sync awaiting integration."],
    priority: "Low",
    serviceType: "Tow",
    status: "Pending",
    units: ["TOW-3"],
  },
];

export const recentBolos: Bolo[] = [
  {
    associated: "Black Schafter, partial plate 29Y",
    createdAt: "13:20",
    description: "Occupants wanted for questioning in multiple firearms calls near Alta.",
    id: "bolo-1",
    location: "Alta / Power corridor",
    priority: "High",
    title: "Armed occupants in black sedan",
    type: "Vehicle",
  },
  {
    associated: "John Doe, DOB unknown",
    createdAt: "12:47",
    description: "Known to flee on foot. Use caution and request additional units.",
    id: "bolo-2",
    location: "Vespucci canals",
    priority: "Medium",
    title: "Felony warrant caution",
    type: "Warrant",
  },
  {
    associated: "9mm handgun",
    createdAt: "11:58",
    description: "Recovered casing pattern linked to active investigation.",
    id: "bolo-3",
    location: "Strawberry Ave",
    priority: "Medium",
    title: "Weapon intelligence bulletin",
    type: "Weapon",
  },
];

export const penalCode: PenalCodeEntry[] = [
  { charge: "Assault with a Deadly Weapon", classification: "Felony", fine: "$7,500", jailTime: "20 months", section: "PC 245" },
  { charge: "Evading a Peace Officer", classification: "Felony", fine: "$5,000", jailTime: "15 months", section: "VC 2800.2" },
  { charge: "Reckless Driving", classification: "Misdemeanor", fine: "$2,000", jailTime: "5 months", section: "VC 23103" },
  { charge: "Possession of Burglary Tools", classification: "Misdemeanor", fine: "$1,500", jailTime: "4 months", section: "PC 466" },
  { charge: "Grand Theft Auto", classification: "Felony", fine: "$6,000", jailTime: "18 months", section: "PC 487(d)" },
];

export const policies: PolicyEntry[] = [
  {
    category: "Patrol",
    id: "policy-100",
    summary: "Units should maintain AVL visibility, update status promptly, and document significant field activity.",
    title: "Patrol Operations",
  },
  {
    category: "Use of Force",
    id: "policy-210",
    summary: "Force reporting workflow is a placeholder until report review and supervisor notification are integrated.",
    title: "Use of Force Reporting",
  },
  {
    category: "Pursuits",
    id: "policy-320",
    summary: "Primary units must broadcast location, direction, traffic, speeds, and reason for pursuit.",
    title: "Vehicle Pursuit Coordination",
  },
  {
    category: "Fire Procedures",
    id: "policy-500",
    summary: "Initial arriving fire unit establishes command, gives size-up, and requests additional resources as needed.",
    title: "Incident Command",
  },
  {
    category: "EMS Protocols",
    id: "policy-610",
    summary: "Patient care documentation is awaiting Supabase/FiveM integration and should not be treated as a medical record.",
    title: "Patient Contact Documentation",
  },
];

export const unitRoster: UnitRosterEntry[] = [
  { agency: "Law Enforcement", assignedCall: "C-2026-0148", callsign: "2L-14", location: "Alta", status: "On Scene", unitType: "Patrol" },
  { agency: "Law Enforcement", assignedCall: "None", callsign: "2S-1", location: "Mission Row", status: "Available", unitType: "Supervisor" },
  { agency: "Fire", assignedCall: "C-2026-0142", callsign: "E-7", location: "Sandy Shores", status: "On Scene", unitType: "Engine" },
  { agency: "Fire", assignedCall: "C-2026-0142", callsign: "B-1", location: "Sandy Shores", status: "On Scene", unitType: "Battalion" },
  { agency: "EMS", assignedCall: "C-2026-0144", callsign: "M-4", location: "Pillbox", status: "Transporting", unitType: "Medic" },
  { agency: "Tow", assignedCall: "C-2026-0139", callsign: "TOW-3", location: "Popular St", status: "Enroute", unitType: "Flatbed" },
];

export const workflowGroups: Record<Agency, string[]> = {
  "Law Enforcement": [
    "Traffic Stop",
    "Pedestrian Stop",
    "Arrest",
    "Citation",
    "Incident Report",
    "Tow/Impound",
    "Field Interview",
  ],
  Fire: ["Fire Report", "Incident Report", "Dispatch Update", "Rehab Note"],
  EMS: ["EMS Report", "Patient Contact", "Transport Note", "Incident Report"],
  Tow: ["Tow/Impound", "Vehicle Handling", "Call Completion"],
};

export const citationWorkflows = ["Citation"];

export const arrestWorkflows = ["Arrest", "Incident Report", "Tow/Impound"];
