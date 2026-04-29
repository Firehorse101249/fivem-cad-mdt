export type AgencyType = "EMS" | "Fire" | "Law Enforcement" | "Tow";

export type CallStatus =
  | "Assigned"
  | "Closed"
  | "Enroute"
  | "Holding"
  | "On Scene"
  | "Pending";

export type ServiceType =
  | "EMS"
  | "Fire"
  | "Law Enforcement"
  | "Multi-agency"
  | "Tow";

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

export type BoloType =
  | "Missing person"
  | "Officer safety"
  | "Person"
  | "Stolen vehicle"
  | "Vehicle"
  | "Weapon";

export type Priority = "Critical" | "High" | "Low" | "Medium";

export type DispatchCall = {
  assignedUnits: string[];
  callNumber: string;
  callerName: string;
  callerPhone: string;
  description: string;
  id: string;
  involvedPersons: string;
  involvedVehicles: string;
  location: string;
  notesCount: number;
  openedAt: string;
  postal: string;
  priority: Priority;
  serviceType: ServiceType;
  status: CallStatus;
  type: string;
};

export type DispatchUnit = {
  agency: string;
  callsign: string;
  currentCall: string;
  id: string;
  lastUpdate: string;
  location: string;
  memberName: string;
  specialty: string;
  status: UnitStatus;
  type: AgencyType;
};

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

export type ActivityLogEntry = {
  actor: string;
  id: string;
  message: string;
  related?: string;
  timestamp: string;
};

export type NewCallForm = {
  callerName: string;
  callerPhone: string;
  description: string;
  involvedPersons: string;
  involvedVehicles: string;
  location: string;
  postal: string;
  priority: Priority;
  serviceType: ServiceType;
  type: string;
};
