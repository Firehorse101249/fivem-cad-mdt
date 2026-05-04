export type Agency = "Law Enforcement" | "Fire" | "EMS" | "Tow";

export type UnitType =
  | "Patrol"
  | "Supervisor"
  | "K9"
  | "SWAT"
  | "Traffic"
  | "Engine"
  | "Ladder"
  | "Rescue"
  | "Battalion"
  | "Brush"
  | "Medic"
  | "Ambulance"
  | "Air Medical"
  | "Flatbed"
  | "Heavy"
  | "Standard";

export type UnitStatus =
  | "Assigned"
  | "Available"
  | "Enroute"
  | "On Scene"
  | "Busy"
  | "Traffic Stop"
  | "Transporting"
  | "At Station"
  | "Out of Service"
  | "Panic"
  | "Signal 100"
  | "Staging"
  | "Rehab"
  | "At Hospital";

export type OfficerModule =
  | "home"
  | "active-calls"
  | "my-status"
  | "lookups"
  | "reports"
  | "citations"
  | "arrests"
  | "warrants"
  | "bolos"
  | "penal-code"
  | "department-policies"
  | "supervisor-panel"
  | "panic"
  | "settings";

export type LookupTab = "Name" | "License" | "Plate" | "Vehicle" | "Weapon" | "Warrant" | "BOLO";

export type Priority = "Low" | "Medium" | "High" | "Critical";

export type MdtSession = {
  agency: Agency;
  callsign: string;
  officerName: string;
  shiftStartedAt: string;
  unitType: UnitType;
};

export type MdtCall = {
  address: string;
  age: string;
  callNumber: string;
  details: string;
  id: string;
  incidentType: string;
  notes: string[];
  priority: Priority;
  serviceType: Agency | "Multi-agency";
  status: "Pending" | "Assigned" | "Enroute" | "On Scene" | "Holding" | "Transporting";
  units: string[];
};

export type Bolo = {
  associated: string;
  createdAt: string;
  description: string;
  id: string;
  location: string;
  priority: Priority;
  title: string;
  type: LookupTab;
};

export type ActivityLogEntry = {
  id: string;
  message: string;
  module: string;
  timestamp: string;
};

export type PenalCodeEntry = {
  charge: string;
  classification: string;
  fine: string;
  jailTime: string;
  section: string;
};

export type PolicyEntry = {
  category: string;
  id: string;
  summary: string;
  title: string;
};

export type UnitRosterEntry = {
  agency: Agency;
  assignedCall: string;
  callsign: string;
  location: string;
  status: UnitStatus;
  unitType: UnitType;
};
