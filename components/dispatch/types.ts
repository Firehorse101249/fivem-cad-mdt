export type DispatchModule =
  | "active-calls"
  | "activity-log"
  | "bolos"
  | "call-creation"
  | "command-center"
  | "fire-ems"
  | "lookups"
  | "map"
  | "settings"
  | "tone-board"
  | "tow"
  | "units";

export type Priority = "Critical" | "High" | "Low" | "Medium";

export type CallStatus =
  | "Assigned"
  | "Closed"
  | "Enroute"
  | "Holding"
  | "On Scene"
  | "Pending";

export type ServiceType = "EMS" | "Fire" | "Law Enforcement" | "Multi-agency" | "Tow";

export type UnitStatus =
  | "At Hospital"
  | "Available"
  | "Busy"
  | "Complete"
  | "Enroute"
  | "On Scene"
  | "Out of Service"
  | "Panic"
  | "Requested"
  | "Signal 100"
  | "Towing"
  | "Transporting";

export type AgencyType = "EMS" | "Fire" | "Law Enforcement" | "Tow";

export type DispatchCall = {
  age: string;
  assignedUnits: string[];
  callNumber: string;
  callerName: string;
  callerNumber: string;
  callSource: string;
  id: string;
  involvedPersons: string;
  involvedVehicles: string;
  location: string;
  narrative: string;
  notes: string[];
  openedAt: string;
  postal: string;
  priority: Priority;
  serviceType: ServiceType;
  status: CallStatus;
  suggestedUnits: string;
  timeline: string[];
  type: string;
};

export type DispatchUnit = {
  agency: string;
  assignedCall: string;
  id: string;
  lastUpdate: string;
  location: string;
  memberName: string;
  specialty: string;
  status: UnitStatus;
  type: AgencyType;
  unit: string;
};

export type BoloType =
  | "Missing person"
  | "Officer safety"
  | "Person"
  | "Stolen vehicle"
  | "Vehicle"
  | "Weapon";

export type Bolo = {
  associated: string;
  createdAt: string;
  createdBy: string;
  description: string;
  id: string;
  lastKnownLocation: string;
  priority: Priority;
  status: "Active" | "Resolved" | "Under Review";
  title: string;
  type: BoloType;
};

export type DispatchLogEntry = {
  actor: string;
  id: string;
  message: string;
  related?: string;
  timestamp: string;
};

export type CallFormState = {
  callerName: string;
  callerNumber: string;
  callSource: string;
  involvedPersons: string;
  involvedVehicles: string;
  location: string;
  narrative: string;
  postal: string;
  priority: Priority;
  serviceType: ServiceType;
  suggestedUnits: string;
  type: string;
};
