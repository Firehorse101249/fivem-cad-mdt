import type {
  Agency,
  LookupTab,
  OfficerModule,
  PenalCodeEntry,
  PolicyEntry,
  UnitStatus,
  UnitType,
} from "./types";

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
