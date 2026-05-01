import { licenseTypes, type CivilianProfile as CivilianProfileRecord } from "./types";

// Temporary mock data. Replace with Supabase live data later.
const ownerId = "mock-user-local-session";

export const mockCivilianCharacters: CivilianProfileRecord[] = [
  {
    id: "civ-1001",
    owner_id: ownerId,
    first_name: "Maya",
    last_name: "Delgado",
    date_of_birth: "1994-08-12",
    gender: "Female",
    height: "5'7\"",
    weight: "142 lb",
    address: "812 Prosperity Street, Los Santos",
    phone: "555-0142",
    occupation: "Tow dispatcher",
    emergency_contact: "Rafael Delgado, 555-0118",
    notes: "Primary civilian profile for city RP.",
    profile_image_url: "",
    images: {
      profile_photo_url: "",
      driver_license_photo_url: "",
      vehicle_registration_photo_url: "",
      mugshot_url: "",
    },
    licenses: licenseTypes.map((licenseType, index) => ({
      id: `lic-maya-${index}`,
      civilian_id: "civ-1001",
      license_type: licenseType,
      status:
        licenseType === "Driver License"
          ? "Valid"
          : licenseType === "Firearm License"
            ? "Expired"
            : "None",
      issued_at: licenseType === "Driver License" ? "2025-01-15T18:00:00Z" : undefined,
      expires_at: licenseType === "Driver License" ? "2027-01-15T18:00:00Z" : undefined,
    })),
    vehicles: [
      {
        id: "veh-1001",
        civilian_id: "civ-1001",
        owner_id: ownerId,
        plate: "8MAYA12",
        make: "Karin",
        model: "Sultan",
        color: "Silver",
        year: 2018,
        vin: "VIN pending",
        insurance_status: "Active",
        registration_status: "Valid",
        notes: "Daily driver. Intended for officer plate lookup.",
      },
    ],
    records: [
      {
        id: "rec-1001",
        civilian_id: "civ-1001",
        record_type: "Warning history",
        title: "Traffic warning",
        description: "Verbal warning for rolling stop. Read-only civilian view.",
        created_by: "officer-demo",
        created_at: "2026-02-04T20:45:00Z",
        visibility: "officer",
      },
    ],
  },
  {
    id: "civ-1002",
    owner_id: ownerId,
    first_name: "Evan",
    last_name: "Cross",
    date_of_birth: "1988-03-21",
    gender: "Male",
    height: "6'1\"",
    weight: "188 lb",
    address: "24 Paleto Boulevard, Paleto Bay",
    phone: "555-0189",
    occupation: "Mechanic",
    emergency_contact: "Nora Cross, 555-0190",
    notes: "Rural mechanic character.",
    profile_image_url: "",
    images: {
      profile_photo_url: "",
      driver_license_photo_url: "",
      vehicle_registration_photo_url: "",
      mugshot_url: "",
    },
    licenses: licenseTypes.map((licenseType, index) => ({
      id: `lic-evan-${index}`,
      civilian_id: "civ-1002",
      license_type: licenseType,
      status:
        licenseType === "Driver License" || licenseType === "Motorcycle Endorsement"
          ? "Valid"
          : licenseType === "Hunting License"
            ? "Suspended"
            : "None",
    })),
    vehicles: [
      {
        id: "veh-1002",
        civilian_id: "civ-1002",
        owner_id: ownerId,
        plate: "CROSS24",
        make: "Vapid",
        model: "Sadler",
        color: "Blue",
        year: 2014,
        vin: "VIN pending",
        insurance_status: "Active",
        registration_status: "Valid",
        notes: "Shop truck.",
      },
    ],
    records: [],
  },
];

export const emptyRecordCategories = [
  "Arrest history",
  "Citation history",
  "Warning history",
  "Warrants",
  "BOLO association",
  "Vehicle registrations",
  "Firearm registrations",
  "Notes/history",
] as const;
