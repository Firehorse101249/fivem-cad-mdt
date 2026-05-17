export type CadSection = {
  title: string;
  href: string;
  description: string;
  status: "Ready" | "Under Construction";
};

export const cadSections: CadSection[] = [
  {
    title: "Dispatch",
    href: "/cad/dispatch",
    description: "Call intake, priority queue, unit assignment, and scene tracking.",
    status: "Ready",
  },
  {
    title: "MDT",
    href: "/cad/officer",
    description: "Unit workspace for law enforcement, fire, EMS, tow, calls, lookup, status, and report flow.",
    status: "Ready",
  },
  {
    title: "FTO MDT",
    href: "/cad/fto",
    description: "Field training workspace for trainee selection, checklist progress, notes, and daily observations.",
    status: "Ready",
  },
  {
    title: "Civilians",
    href: "/cad/civilians",
    description: "Civilian profiles, identifiers, licenses, and RP character records.",
    status: "Ready",
  },
  {
    title: "Businesses",
    href: "/cad/businesses",
    description: "Business licenses, ownership, employee rosters, and commercial records.",
    status: "Under Construction",
  },
  {
    title: "Gangs",
    href: "/cad/gangs",
    description: "Gang profiles, territories, affiliations, intelligence notes, and alerts.",
    status: "Under Construction",
  },
  {
    title: "DMV",
    href: "/cad/dmv",
    description: "Driver licensing, registrations, tests, suspensions, and DMV service records.",
    status: "Under Construction",
  },
  {
    title: "Legal",
    href: "/cad/legal",
    description: "Court, attorney, case, statute, and legal workflow references.",
    status: "Under Construction",
  },
  {
    title: "Government",
    href: "/cad/government",
    description: "Government offices, public employees, permits, notices, and civic records.",
    status: "Under Construction",
  },
  {
    title: "Policies",
    href: "/cad/policies",
    description: "Department policies, SOPs, server rules, and staff-facing guidance.",
    status: "Under Construction",
  },
  {
    title: "Settings",
    href: "/cad/settings",
    description: "Department settings, preferences, identifiers, and future integrations.",
    status: "Under Construction",
  },
];
