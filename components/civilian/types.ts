export const DEFAULT_CIVILIAN_PROFILE_LIMIT = 3;
// TODO: Later connect this to admin-configurable user limits.

export const licenseTypes = [
  "Driver License",
  "Commercial Driver License",
  "Motorcycle Endorsement",
  "Pilot License",
  "Boat License",
  "Hunting License",
  "Fishing License",
  "Firearm License",
  "Concealed Carry Permit",
] as const;

export const licenseStatuses = ["Valid", "Expired", "Suspended", "Revoked", "None"] as const;

export type LicenseType = (typeof licenseTypes)[number];
export type LicenseStatus = (typeof licenseStatuses)[number];

export type CivilianLicense = {
  id: string;
  civilian_id: string;
  expires_at?: string;
  issued_at?: string;
  license_type: LicenseType;
  status: LicenseStatus;
  updated_by?: string;
};

export type CivilianVehicle = {
  id: string;
  civilian_id: string;
  color: string;
  insurance_status: string;
  make: string;
  model: string;
  notes: string;
  owner_id: string;
  plate: string;
  registration_status: string;
  vin: string;
  year: number | "";
};

export type CivilianRecord = {
  id: string;
  civilian_id: string;
  created_at: string;
  created_by?: string;
  description: string;
  record_type:
    | "Arrest history"
    | "Citation history"
    | "Warning history"
    | "Warrants"
    | "BOLO association"
    | "Vehicle registrations"
    | "Firearm registrations"
    | "Notes/history";
  title: string;
  visibility: "civilian" | "officer" | "admin";
};

export type CivilianImages = {
  driver_license_photo_url?: string;
  mugshot_url?: string;
  profile_photo_url?: string;
  vehicle_registration_photo_url?: string;
};

export type CivilianProfile = {
  id: string;
  owner_id: string;
  address: string;
  date_of_birth: string;
  emergency_contact: string;
  first_name: string;
  gender: string;
  height: string;
  images: CivilianImages;
  last_name: string;
  licenses: CivilianLicense[];
  notes: string;
  occupation: string;
  phone: string;
  profile_image_url?: string;
  records: CivilianRecord[];
  vehicles: CivilianVehicle[];
  weight: string;
};

export type CivilianFormState = {
  address: string;
  date_of_birth: string;
  emergency_contact: string;
  first_name: string;
  gender: string;
  height: string;
  last_name: string;
  notes: string;
  occupation: string;
  phone: string;
  profile_image_url: string;
  weight: string;
};
