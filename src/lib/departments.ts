export type DepartmentService = "Law Enforcement" | "Fire" | "EMS" | "Tow" | "Dispatch" | "Civilian" | "Government" | "System";

export type DepartmentOption = {
  abbreviation: string;
  category: string;
  key: string;
  name: string;
  service: DepartmentService;
  sortOrder: number;
};

export const departmentCatalog: DepartmentOption[] = [
  { abbreviation: "LSPD", category: "law_enforcement", key: "lspd", name: "Los Santos Police Department", service: "Law Enforcement", sortOrder: 10 },
  { abbreviation: "BCSO", category: "law_enforcement", key: "bcso", name: "Blaine County Sheriff's Office", service: "Law Enforcement", sortOrder: 20 },
  { abbreviation: "SASP", category: "law_enforcement", key: "sasp", name: "San Andreas State Police", service: "Law Enforcement", sortOrder: 30 },
  { abbreviation: "FIB", category: "law_enforcement", key: "fib", name: "Federal Investigation Bureau", service: "Law Enforcement", sortOrder: 40 },
  { abbreviation: "LSFD", category: "fire", key: "lsfd", name: "Los Santos Fire Department", service: "Fire", sortOrder: 50 },
  { abbreviation: "EMS", category: "ems", key: "saems", name: "San Andreas Emergency Medical Services", service: "EMS", sortOrder: 60 },
  { abbreviation: "SATR", category: "services", key: "satr", name: "San Andreas Towing and Recovery", service: "Tow", sortOrder: 70 },
  { abbreviation: "SACOM", category: "dispatch", key: "sacom", name: "San Andreas Communications", service: "Dispatch", sortOrder: 80 },
  { abbreviation: "CIV", category: "civilian", key: "civilian", name: "Civilian Operations", service: "Civilian", sortOrder: 90 },
  { abbreviation: "DOJ", category: "government", key: "doj", name: "Department of Justice", service: "Government", sortOrder: 100 },
  { abbreviation: "GOV", category: "government", key: "government", name: "Governor's Office", service: "Government", sortOrder: 110 },
];

export function departmentByKey(key?: string | null) {
  return departmentCatalog.find((department) => department.key === key) ?? null;
}

export function departmentLabel(key?: string | null) {
  const department = departmentByKey(key);
  return department ? department.abbreviation : key || "System";
}
