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
    status: "Under Construction",
  },
  {
    title: "Officer MDT",
    href: "/cad/officer",
    description: "Patrol workspace for calls, lookup, status, and report flow.",
    status: "Under Construction",
  },
  {
    title: "Civilians",
    href: "/cad/civilians",
    description: "Civilian profiles, identifiers, licenses, and RP character records.",
    status: "Under Construction",
  },
  {
    title: "Vehicles",
    href: "/cad/vehicles",
    description: "Vehicle registration, plates, ownership, and flags.",
    status: "Under Construction",
  },
  {
    title: "Reports",
    href: "/cad/reports",
    description: "Incident reports, narratives, supplements, and review workflows.",
    status: "Under Construction",
  },
  {
    title: "Warrants",
    href: "/cad/warrants",
    description: "Active warrants, wanted records, approvals, and expiry tracking.",
    status: "Under Construction",
  },
  {
    title: "BOLOs",
    href: "/cad/bolos",
    description: "Be-on-the-lookout notices for persons, vehicles, and officer safety.",
    status: "Under Construction",
  },
  {
    title: "Citations",
    href: "/cad/citations",
    description: "Citation writing, fine tables, court references, and history.",
    status: "Under Construction",
  },
  {
    title: "Arrests",
    href: "/cad/arrests",
    description: "Arrest booking, charges, evidence references, and custody notes.",
    status: "Under Construction",
  },
  {
    title: "Calls",
    href: "/cad/calls",
    description: "Call history, active events, notes, timestamps, and dispositions.",
    status: "Under Construction",
  },
  {
    title: "Settings",
    href: "/cad/settings",
    description: "Department settings, preferences, identifiers, and future integrations.",
    status: "Under Construction",
  },
];
