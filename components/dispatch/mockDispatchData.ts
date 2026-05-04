import type { CallFormState } from "./types";

export const initialCallForm: CallFormState = {
  callerName: "",
  callerNumber: "",
  callSource: "911 Call",
  involvedPersons: "",
  involvedVehicles: "",
  location: "",
  narrative: "",
  postal: "",
  priority: "Medium",
  serviceType: "Law Enforcement",
  suggestedUnits: "",
  type: "",
};

export const incidentTypes = {
  EMS: ["Medical emergency", "Trauma", "Cardiac", "Overdose", "Unconscious person", "MVA injuries", "Psychiatric crisis"],
  Fire: ["Structure fire", "Vehicle fire", "Brush fire", "Alarm activation", "Hazmat", "Rescue", "Medical assist"],
  "Law Enforcement": ["Traffic stop", "Disturbance", "Robbery", "Welfare check", "MVA", "Shots fired"],
  "Multi-agency": ["MVA injuries", "Structure fire", "Active threat", "Mass casualty", "Evacuation"],
  Tow: ["Standard tow", "Flatbed", "Heavy wrecker", "Impound", "Roadside assistance"],
};
