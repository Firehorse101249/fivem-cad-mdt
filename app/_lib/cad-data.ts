import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CivilianFormState,
  CivilianLicense,
  CivilianProfile,
  CivilianRecord,
  CivilianVehicle,
  LicenseStatus,
  LicenseType,
} from "@/components/civilian/types";
import { licenseTypes } from "@/components/civilian/types";
import type {
  Bolo,
  BoloType,
  CallFormState,
  CallStatus,
  DispatchCall,
  DispatchUnit,
  Priority,
  ServiceType,
  UnitStatus as DispatchUnitStatus,
} from "@/components/dispatch/types";
import type {
  Agency,
  Bolo as MdtBolo,
  LookupTab,
  MdtCall,
  MdtSession,
  UnitRosterEntry,
  UnitStatus as OfficerUnitStatus,
} from "@/components/officer-mdt/types";

type Row = Record<string, unknown>;

export type CadLookupResult = {
  civilianId?: string;
  id: string;
  label: string;
  meta: string;
  source: "BOLO" | "Civilian" | "License" | "Record" | "Vehicle" | "Weapon";
};

export type CadLookupScope = "All" | "BOLO" | "License" | "Name" | "Plate" | "Vehicle" | "Warrant" | "Weapon";

export type CadLookupDetail = {
  activeBolos: CadLookupResult[];
  civilian: CivilianProfile;
  flags: string[];
  isWanted: boolean;
};

export type RmsRecordType = "Arrest history" | "Citation history" | "Warning history" | "Warrants" | "Notes/history";

export type RmsRecordPayload = {
  civilianId: string;
  createdBy?: string;
  description: string;
  metadata?: Record<string, unknown>;
  recordType: RmsRecordType;
  title: string;
};

const fallbackActor = "SYSTEM";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberOrBlank(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

function rowArray(value: unknown) {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function metadata(row: Row) {
  const value = row.metadata;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

function timeLabel(value: unknown) {
  const date = typeof value === "string" ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function ageLabel(value: unknown) {
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "0m";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function makeCallNumber() {
  const now = new Date();
  const stamp = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `C-${now.getFullYear()}-${stamp}`;
}

function mapLicense(row: Row, civilianId: string): CivilianLicense {
  return {
    civilian_id: text(row.civilian_id, civilianId),
    expires_at: text(row.expires_at) || undefined,
    id: text(row.id),
    issued_at: text(row.issued_at) || undefined,
    license_type: text(row.license_type, "Driver License") as LicenseType,
    status: text(row.status, "None") as LicenseStatus,
    updated_by: text(row.updated_by) || undefined,
  };
}

function mapVehicle(row: Row, fallbackOwnerId = ""): CivilianVehicle {
  return {
    civilian_id: text(row.civilian_id),
    color: text(row.color),
    id: text(row.id),
    insurance_status: text(row.insurance_status, "Active"),
    make: text(row.make),
    model: text(row.model),
    notes: text(row.notes),
    owner_id: text(row.owner_id, fallbackOwnerId),
    plate: text(row.plate),
    registration_status: text(row.registration_status, "Valid"),
    vin: text(row.vin),
    year: numberOrBlank(row.year),
  };
}

function mapRecord(row: Row): CivilianRecord {
  return {
    civilian_id: text(row.civilian_id),
    created_at: text(row.created_at),
    created_by: text(row.created_by) || undefined,
    description: text(row.description),
    id: text(row.id),
    record_type: text(row.record_type, "Notes/history") as CivilianRecord["record_type"],
    title: text(row.title),
    visibility: text(row.visibility, "officer") as CivilianRecord["visibility"],
  };
}

function mapCivilian(row: Row): CivilianProfile {
  const id = text(row.id);
  const ownerId = text(row.owner_id);
  const licenses = rowArray(row.civilian_licenses).map((item) => mapLicense(item, id));
  const licenseRows = licenseTypes.map((licenseType) => (
    licenses.find((license) => license.license_type === licenseType) ?? {
      civilian_id: id,
      id: `${id}-${licenseType}`,
      license_type: licenseType,
      status: "None" as LicenseStatus,
    }
  ));

  return {
    address: text(row.address),
    date_of_birth: text(row.date_of_birth),
    emergency_contact: text(row.emergency_contact),
    first_name: text(row.first_name),
    gender: text(row.gender),
    height: text(row.height),
    id,
    images: {
      profile_photo_url: text(row.profile_image_url),
    },
    last_name: text(row.last_name),
    licenses: licenseRows,
    notes: text(row.notes),
    occupation: text(row.occupation),
    owner_id: ownerId,
    phone: text(row.phone),
    profile_image_url: text(row.profile_image_url),
    records: rowArray(row.civilian_records).map(mapRecord),
    vehicles: rowArray(row.civilian_vehicles).map((item) => mapVehicle(item, ownerId)),
    weight: text(row.weight),
  };
}

function mapDispatchCall(row: Row): DispatchCall {
  const meta = metadata(row);
  const callNumber = text(row.call_number) || makeCallNumber();
  const notes = textArray(meta.ui_notes);
  const timeline = textArray(meta.timeline);

  return {
    age: ageLabel(row.created_at),
    assignedUnits: textArray(row.assigned_units),
    callerName: text(row.caller_name),
    callerNumber: text(row.caller_phone),
    callNumber,
    callSource: text(meta.call_source, "CAD"),
    id: text(row.id),
    involvedPersons: text(row.involved_persons),
    involvedVehicles: text(row.involved_vehicles),
    location: text(row.location),
    narrative: text(row.description),
    notes: notes.length ? notes : text(row.notes) ? [text(row.notes)] : [],
    openedAt: timeLabel(row.created_at),
    postal: text(row.postal),
    priority: text(row.priority, "Medium") as Priority,
    serviceType: text(row.service_type, "Law Enforcement") as ServiceType,
    status: text(row.status, "Pending") as CallStatus,
    suggestedUnits: text(meta.suggested_units),
    timeline: timeline.length ? timeline : [`${timeLabel(row.created_at)} call opened`],
    type: text(row.call_type),
  };
}

function mapDispatchUnit(row: Row, callNumberById: Map<string, string>): DispatchUnit {
  const currentCallId = text(row.current_call_id);
  return {
    agency: text(row.agency),
    assignedCall: currentCallId ? callNumberById.get(currentCallId) ?? currentCallId : "None",
    id: text(row.id),
    lastUpdate: timeLabel(row.updated_at || row.created_at),
    location: text(row.location) || text(row.postal),
    memberName: text(row.member_name),
    specialty: text(row.specialty) || text(row.unit_type),
    status: text(row.status, "Available") as DispatchUnitStatus,
    type: text(row.agency, "Law Enforcement") as DispatchUnit["type"],
    unit: text(row.callsign),
  };
}

function mapBolo(row: Row): Bolo {
  return {
    associated: text(row.associated_subject),
    createdAt: timeLabel(row.created_at),
    createdBy: text(row.created_by, fallbackActor),
    description: text(row.description),
    id: text(row.id),
    lastKnownLocation: text(row.last_known_location),
    priority: text(row.priority, "Medium") as Priority,
    status: text(row.status, "Active") as Bolo["status"],
    title: text(row.title),
    type: text(row.type, "Person") as BoloType,
  };
}

export async function loadCivilianProfiles(supabase: SupabaseClient, ownerId?: string) {
  let query = supabase
    .from("civilian_profiles")
    .select("*, civilian_licenses(*), civilian_vehicles(*), civilian_records(*)")
    .order("created_at", { ascending: false });

  if (ownerId) {
    query = query.eq("owner_id", ownerId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapCivilian);
}

export async function createCivilianProfile(supabase: SupabaseClient, ownerId: string, form: CivilianFormState) {
  const { data, error } = await supabase
    .from("civilian_profiles")
    .insert({
      ...form,
      owner_id: ownerId,
      profile_image_url: form.profile_image_url || null,
    })
    .select()
    .single();

  if (error) throw error;

  const civilian = mapCivilian(data as Row);
  const licenseRows = licenseTypes.map((licenseType) => ({
    civilian_id: civilian.id,
    license_type: licenseType,
    status: "None",
  }));
  const { error: licenseError } = await supabase.from("civilian_licenses").insert(licenseRows);
  if (licenseError) throw licenseError;

  return civilian;
}

export async function updateCivilianProfile(supabase: SupabaseClient, civilianId: string, form: CivilianFormState) {
  const { data, error } = await supabase
    .from("civilian_profiles")
    .update({
      ...form,
      profile_image_url: form.profile_image_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", civilianId)
    .select()
    .single();

  if (error) throw error;
  return mapCivilian(data as Row);
}

export async function saveCivilianLicense(
  supabase: SupabaseClient,
  civilianId: string,
  licenseType: LicenseType,
  status: LicenseStatus,
) {
  const { data: existing, error: lookupError } = await supabase
    .from("civilian_licenses")
    .select("id")
    .eq("civilian_id", civilianId)
    .eq("license_type", licenseType)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing && typeof existing === "object" && "id" in existing) {
    const { error } = await supabase
      .from("civilian_licenses")
      .update({ status })
      .eq("id", String(existing.id));
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("civilian_licenses").insert({
    civilian_id: civilianId,
    license_type: licenseType,
    status,
  });
  if (error) throw error;
}

export async function createCivilianVehicle(
  supabase: SupabaseClient,
  ownerId: string,
  civilianId: string,
  vehicle: Omit<CivilianVehicle, "civilian_id" | "id" | "owner_id">,
) {
  const { data, error } = await supabase
    .from("civilian_vehicles")
    .insert({
      ...vehicle,
      civilian_id: civilianId,
      owner_id: ownerId,
      plate: vehicle.plate.trim().toUpperCase(),
      year: vehicle.year === "" ? null : vehicle.year,
    })
    .select()
    .single();

  if (error) throw error;
  return mapVehicle(data as Row, ownerId);
}

export async function loadDispatchData(supabase: SupabaseClient) {
  const [callsResult, unitsResult, bolosResult] = await Promise.all([
    supabase.from("dispatch_calls").select("*").neq("status", "Closed").order("created_at", { ascending: false }),
    supabase.from("dispatch_units").select("*").order("callsign", { ascending: true }),
    supabase.from("bolos").select("*").order("created_at", { ascending: false }),
  ]);

  if (callsResult.error) throw callsResult.error;
  if (unitsResult.error) throw unitsResult.error;
  if (bolosResult.error) throw bolosResult.error;

  const calls = ((callsResult.data ?? []) as Row[]).map(mapDispatchCall);
  const callNumberById = new Map(calls.map((call) => [call.id, call.callNumber]));
  const units = ((unitsResult.data ?? []) as Row[]).map((unit) => mapDispatchUnit(unit, callNumberById));
  const bolos = ((bolosResult.data ?? []) as Row[]).map(mapBolo);

  return { bolos, calls, units };
}

export async function createDispatchCall(supabase: SupabaseClient, form: CallFormState, createdBy?: string) {
  const callNumber = makeCallNumber();
  const opened = timeLabel(new Date().toISOString());
  const { data, error } = await supabase
    .from("dispatch_calls")
    .insert({
      assigned_units: [],
      call_number: callNumber,
      call_type: form.type,
      caller_name: form.callerName,
      caller_phone: form.callerNumber,
      created_by: createdBy || null,
      description: form.narrative,
      involved_persons: form.involvedPersons,
      involved_vehicles: form.involvedVehicles,
      location: form.location,
      metadata: {
        call_source: form.callSource,
        suggested_units: form.suggestedUnits,
        timeline: [`${opened} call opened`],
        ui_notes: ["Initial call created from dispatch workstation."],
      },
      postal: form.postal,
      priority: form.priority,
      service_type: form.serviceType,
      status: "Pending",
    })
    .select()
    .single();

  if (error) throw error;
  return mapDispatchCall(data as Row);
}

export async function updateDispatchCallStatus(supabase: SupabaseClient, call: DispatchCall, status: CallStatus) {
  if (status === "Closed") {
    const { error } = await supabase.from("dispatch_calls").delete().eq("id", call.id);
    if (error) throw error;
    return null;
  }

  const timeline = [`${timeLabel(new Date().toISOString())} status changed to ${status}`, ...call.timeline];
  const { data, error } = await supabase
    .from("dispatch_calls")
    .update({
      metadata: {
        call_source: call.callSource,
        suggested_units: call.suggestedUnits,
        timeline,
        ui_notes: call.notes,
      },
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", call.id)
    .select()
    .single();

  if (error) throw error;
  return mapDispatchCall(data as Row);
}

export async function updateDispatchCallUnits(supabase: SupabaseClient, call: MdtCall | DispatchCall, units: string[]) {
  const { data, error } = await supabase
    .from("dispatch_calls")
    .update({ assigned_units: units, status: units.length ? "Assigned" : call.status, updated_at: new Date().toISOString() })
    .eq("id", call.id)
    .select()
    .single();

  if (error) throw error;
  return mapDispatchCall(data as Row);
}

export async function assignDispatchUnitToCall(supabase: SupabaseClient, call: DispatchCall, unit: DispatchUnit) {
  const assignedUnits = call.assignedUnits.includes(unit.unit) ? call.assignedUnits : [...call.assignedUnits, unit.unit];
  const updatedCall = await updateDispatchCallUnits(supabase, call, assignedUnits);

  const { error } = await supabase
    .from("dispatch_units")
    .update({
      current_call_id: call.id,
      status: unit.status === "Available" ? "Assigned" : unit.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", unit.id);

  if (error) throw error;
  return updatedCall;
}

export async function removeDispatchUnitFromCall(supabase: SupabaseClient, call: DispatchCall, unit: DispatchUnit) {
  const assignedUnits = call.assignedUnits.filter((callsign) => callsign !== unit.unit);
  const updatedCall = await updateDispatchCallUnits(supabase, call, assignedUnits);

  const { error } = await supabase
    .from("dispatch_units")
    .update({
      current_call_id: null,
      status: unit.status === "Assigned" ? "Available" : unit.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", unit.id);

  if (error) throw error;
  return updatedCall;
}

export async function createBolo(supabase: SupabaseClient, form: FormData, createdBy?: string) {
  const { data, error } = await supabase
    .from("bolos")
    .insert({
      associated_subject: String(form.get("associated") ?? ""),
      created_by: createdBy || null,
      description: String(form.get("description") ?? ""),
      last_known_location: String(form.get("location") ?? ""),
      priority: String(form.get("priority") ?? "Medium"),
      status: "Active",
      title: String(form.get("title") ?? ""),
      type: String(form.get("type") ?? "Person"),
    })
    .select()
    .single();

  if (error) throw error;
  return mapBolo(data as Row);
}

export async function updateDispatchUnitStatus(supabase: SupabaseClient, unitId: string, status: DispatchUnitStatus | OfficerUnitStatus) {
  const { data, error } = await supabase
    .from("dispatch_units")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", unitId)
    .select()
    .single();

  if (error) throw error;
  return data as Row;
}

export async function updateDispatchUnitIdentifier(supabase: SupabaseClient, unitId: string, callsign: string) {
  const { data, error } = await supabase
    .from("dispatch_units")
    .update({ callsign: callsign.trim().toUpperCase(), updated_at: new Date().toISOString() })
    .eq("id", unitId)
    .select()
    .single();

  if (error) throw error;
  return data as Row;
}

export async function removeDispatchUnit(supabase: SupabaseClient, unitId: string) {
  const { error } = await supabase.from("dispatch_units").delete().eq("id", unitId);
  if (error) throw error;
}

export async function removeDispatchUnitByCallsign(supabase: SupabaseClient, callsign: string) {
  const { error } = await supabase.from("dispatch_units").delete().eq("callsign", callsign);
  if (error) throw error;
}

export async function upsertOfficerUnit(supabase: SupabaseClient, session: MdtSession, status: OfficerUnitStatus, userId?: string) {
  const { data: existing, error: lookupError } = await supabase
    .from("dispatch_units")
    .select("id")
    .eq("callsign", session.callsign)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const payload = {
    agency: session.agency,
    callsign: session.callsign,
    created_by: userId || null,
    member_name: session.officerName,
    status,
    unit_type: session.unitType,
    updated_at: new Date().toISOString(),
  };

  if (existing && typeof existing === "object" && "id" in existing) {
    const { error } = await supabase.from("dispatch_units").update(payload).eq("id", String(existing.id));
    if (error) throw error;
    return String(existing.id);
  }

  const { data, error } = await supabase.from("dispatch_units").insert(payload).select("id").single();
  if (error) throw error;
  return text((data as Row).id);
}

export function dispatchCallsToMdt(calls: DispatchCall[]): MdtCall[] {
  return calls.map((call) => ({
    address: `${call.location}${call.postal ? `, Postal ${call.postal}` : ""}`,
    age: call.age,
    callNumber: call.callNumber,
    details: call.narrative,
    id: call.id,
    incidentType: call.type,
    notes: call.notes.length ? call.notes : call.timeline,
    priority: call.priority,
    serviceType: call.serviceType as MdtCall["serviceType"],
    status: call.status as MdtCall["status"],
    units: call.assignedUnits,
  }));
}

export function dispatchBolosToMdt(bolos: Bolo[]): MdtBolo[] {
  return bolos.map((bolo) => ({
    associated: bolo.associated,
    createdAt: bolo.createdAt,
    description: bolo.description,
    id: bolo.id,
    location: bolo.lastKnownLocation,
    priority: bolo.priority,
    title: bolo.title,
    type: normalizeLookupTab(bolo.type),
  }));
}

export function dispatchUnitsToRoster(units: DispatchUnit[]): UnitRosterEntry[] {
  return units.map((unit) => ({
    agency: unit.type as Agency,
    assignedCall: unit.assignedCall,
    callsign: unit.unit,
    id: unit.id,
    location: unit.location,
    status: unit.status as UnitRosterEntry["status"],
    unitType: unit.specialty as UnitRosterEntry["unitType"],
  }));
}

function normalizeLookupTab(value: string): LookupTab {
  if (value === "Vehicle" || value === "Weapon" || value === "Warrant" || value === "BOLO") return value;
  return "BOLO";
}

function lookupScopeFromQuery(query: string): CadLookupScope {
  const prefix = query.split(":")[0]?.trim().toLowerCase();
  if (prefix === "bolo") return "BOLO";
  if (prefix === "license") return "License";
  if (prefix === "name") return "Name";
  if (prefix === "plate") return "Plate";
  if (prefix === "vehicle") return "Vehicle";
  if (prefix === "warrant") return "Warrant";
  if (prefix === "weapon") return "Weapon";
  return "All";
}

function lookupValueFromQuery(query: string) {
  return query.includes(":") ? query.split(":").slice(1).join(":").trim() : query.trim();
}

function lookupTerms(query: string) {
  return query
    .replace(/[%,()]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function ilikeFilter(columns: string[], terms: string[]) {
  return terms.flatMap((term) => columns.map((column) => `${column}.ilike.%${term}%`)).join(",");
}

function includesScope(scope: CadLookupScope, scopes: CadLookupScope[]) {
  return scope === "All" || scopes.includes(scope);
}

function isMissingLookupTable(error: { code?: string; message?: string }) {
  return error.code === "PGRST205" || /could not find the table|relation .* does not exist/i.test(error.message ?? "");
}

async function lookupRows(
  request: PromiseLike<{ data: unknown[] | null; error: { code?: string; message: string } | null }>,
  options: { optional?: boolean } = {},
) {
  const { data, error } = await request;
  if (error) {
    if (options.optional && isMissingLookupTable(error)) return [];
    throw error;
  }
  return (data ?? []) as Row[];
}

export async function searchCadRecords(supabase: SupabaseClient, query: string, scope: CadLookupScope = lookupScopeFromQuery(query)) {
  const normalized = lookupValueFromQuery(query);
  if (!normalized) return [];

  const terms = lookupTerms(normalized);
  if (!terms.length) return [];

  const searches: Array<Promise<{ rows: Row[]; type: CadLookupResult["source"] | "CivilianLicense" | "VehicleRecord" }>> = [];

  if (includesScope(scope, ["Name"])) {
    searches.push(
      lookupRows(
        supabase
          .from("civilian_profiles")
          .select("id, first_name, last_name, date_of_birth, address, phone")
          .or(ilikeFilter(["first_name", "last_name", "address", "phone"], terms)),
      ).then((rows) => ({ rows, type: "Civilian" })),
    );
  }

  if (includesScope(scope, ["License", "Name"])) {
    searches.push(
      lookupRows(
        supabase
          .from("civilian_licenses")
          .select("id, civilian_id, license_type, status, expires_at, civilian_profiles(first_name, last_name, date_of_birth)")
          .or(ilikeFilter(["license_type", "status"], terms)),
      ).then((rows) => ({ rows, type: "CivilianLicense" })),
      lookupRows(
        supabase
          .from("license_records")
          .select("id, license_type, license_number, status, expires_at, notes")
          .or(ilikeFilter(["license_type", "license_number", "status", "notes"], terms)),
        { optional: true },
      ).then((rows) => ({ rows, type: "License" })),
    );
  }

  if (includesScope(scope, ["Plate", "Vehicle"])) {
    searches.push(
      lookupRows(
        supabase
          .from("civilian_vehicles")
          .select("id, plate, make, model, color, vin, insurance_status, registration_status")
          .or(ilikeFilter(["plate", "vin", "make", "model", "color"], terms)),
      ).then((rows) => ({ rows, type: "Vehicle" })),
      lookupRows(
        supabase
          .from("vehicle_records")
          .select("id, plate, vin, make, model, color, status, notes")
          .or(ilikeFilter(["plate", "vin", "make", "model", "color", "status", "notes"], terms)),
        { optional: true },
      ).then((rows) => ({ rows, type: "VehicleRecord" })),
    );
  }

  if (includesScope(scope, ["Weapon"])) {
    searches.push(
      lookupRows(
        supabase
          .from("weapons")
          .select("id, serial_number, weapon_type, status, notes")
          .or(ilikeFilter(["serial_number", "weapon_type", "status", "notes"], terms)),
        { optional: true },
      ).then((rows) => ({ rows, type: "Weapon" })),
    );
  }

  if (includesScope(scope, ["BOLO", "Vehicle", "Weapon", "Warrant"])) {
    let boloQuery = supabase
      .from("bolos")
      .select("id, title, type, associated_subject, last_known_location, priority, status")
      .or(ilikeFilter(["title", "type", "associated_subject", "last_known_location", "description", "notes"], terms));

    if (scope === "BOLO") boloQuery = boloQuery.eq("status", "Active");
    if (scope === "Vehicle") boloQuery = boloQuery.in("type", ["Vehicle", "Stolen vehicle"]);
    if (scope === "Weapon") boloQuery = boloQuery.eq("type", "Weapon");
    if (scope === "Warrant") boloQuery = boloQuery.eq("type", "Warrant");

    searches.push(lookupRows(boloQuery).then((rows) => ({ rows, type: "BOLO" })));
  }

  if (includesScope(scope, ["Name", "Warrant", "Weapon"])) {
    let recordQuery = supabase
      .from("civilian_records")
      .select("id, civilian_id, record_type, title, description, created_at")
      .or(ilikeFilter(["record_type", "title", "description"], terms));

    if (scope === "Warrant") recordQuery = recordQuery.ilike("record_type", "%warrant%");
    if (scope === "Weapon") recordQuery = recordQuery.ilike("record_type", "%weapon%");

    searches.push(lookupRows(recordQuery).then((rows) => ({ rows, type: "Record" })));
  }

  const batches = await Promise.all(searches);
  const results: CadLookupResult[] = [];

  for (const batch of batches) {
    for (const row of batch.rows) {
      if (batch.type === "Civilian") {
        results.push({
          civilianId: text(row.id),
          id: text(row.id),
          label: `${text(row.first_name)} ${text(row.last_name)}`.trim() || "Unnamed civilian",
          meta: [text(row.date_of_birth), text(row.address), text(row.phone)].filter(Boolean).join(" / "),
          source: "Civilian",
        });
      }
      if (batch.type === "CivilianLicense") {
        const profile = metadata({ metadata: row.civilian_profiles });
        results.push({
          civilianId: text(row.civilian_id),
          id: text(row.id),
          label: `${text(row.license_type, "License")} - ${text(row.status, "Unknown")}`,
          meta: [`Civilian: ${`${text(profile.first_name)} ${text(profile.last_name)}`.trim() || text(row.civilian_id)}`, text(profile.date_of_birth), text(row.expires_at) ? `Expires ${text(row.expires_at)}` : ""].filter(Boolean).join(" / "),
          source: "License",
        });
      }
      if (batch.type === "License") {
        results.push({
          id: text(row.id),
          label: text(row.license_number) || text(row.license_type, "License record"),
          meta: [text(row.license_type), text(row.status), text(row.expires_at) ? `Expires ${text(row.expires_at)}` : "", text(row.notes)].filter(Boolean).join(" / "),
          source: "License",
        });
      }
      if (batch.type === "Vehicle" || batch.type === "VehicleRecord") {
        results.push({
          civilianId: text(row.civilian_id) || undefined,
          id: text(row.id),
          label: text(row.plate) || "No plate",
          meta: [text(row.color), text(row.make), text(row.model), text(row.vin), text(row.registration_status) || text(row.status), text(row.insurance_status), text(row.notes)].filter(Boolean).join(" / "),
          source: "Vehicle",
        });
      }
      if (batch.type === "Weapon") {
        results.push({
          id: text(row.id),
          label: text(row.serial_number) || text(row.weapon_type, "Weapon record"),
          meta: [text(row.weapon_type), text(row.status), text(row.notes)].filter(Boolean).join(" / "),
          source: "Weapon",
        });
      }
      if (batch.type === "BOLO") {
        results.push({
          id: text(row.id),
          label: text(row.title, "BOLO"),
          meta: [text(row.type), text(row.status), text(row.priority), text(row.associated_subject), text(row.last_known_location)].filter(Boolean).join(" / "),
          source: "BOLO",
        });
      }
      if (batch.type === "Record") {
        results.push({
          civilianId: text(row.civilian_id),
          id: text(row.id),
          label: text(row.title) || text(row.record_type, "Record"),
          meta: [text(row.record_type), text(row.description), text(row.created_at)].filter(Boolean).join(" / "),
          source: "Record",
        });
      }
    }
  }

  return results;
}

export async function loadCadLookupDetail(supabase: SupabaseClient, civilianId: string) {
  const { data, error } = await supabase
    .from("civilian_profiles")
    .select("*, civilian_licenses(*), civilian_vehicles(*), civilian_records(*)")
    .eq("id", civilianId)
    .single();

  if (error) throw error;

  const civilian = mapCivilian(data as Row);
  const fullName = `${civilian.first_name} ${civilian.last_name}`.trim();
  const boloTerms = [fullName, ...civilian.vehicles.map((vehicle) => vehicle.plate)].filter(Boolean);
  const activeBolos: CadLookupResult[] = [];

  if (boloTerms.length) {
    const filter = ilikeFilter(["title", "associated_subject", "description"], lookupTerms(boloTerms.join(" ")));
    const rows = await lookupRows(
      supabase
        .from("bolos")
        .select("id, title, type, associated_subject, last_known_location, priority, status")
        .eq("status", "Active")
        .or(filter),
    );

    for (const row of rows) {
      activeBolos.push({
        id: text(row.id),
        label: text(row.title, "BOLO"),
        meta: [text(row.type), text(row.priority), text(row.associated_subject), text(row.last_known_location)].filter(Boolean).join(" / "),
        source: "BOLO",
      });
    }
  }

  const flags = [
    ...civilian.records
      .filter((record) => ["BOLO association", "Warrants", "Notes/history"].includes(record.record_type))
      .map((record) => `${record.record_type}: ${record.title}`),
    ...civilian.licenses
      .filter((license) => ["Suspended", "Revoked", "Expired"].includes(license.status))
      .map((license) => `${license.license_type} ${license.status}`),
    ...civilian.vehicles
      .filter((vehicle) => vehicle.registration_status !== "Valid" || vehicle.insurance_status !== "Active")
      .map((vehicle) => `${vehicle.plate || "Vehicle"} registration ${vehicle.registration_status || "unknown"} / insurance ${vehicle.insurance_status || "unknown"}`),
  ];

  return {
    activeBolos,
    civilian,
    flags,
    isWanted: civilian.records.some((record) => record.record_type === "Warrants") || activeBolos.some((bolo) => /warrant/i.test(`${bolo.label} ${bolo.meta}`)),
  } satisfies CadLookupDetail;
}

export async function createCivilianRmsRecord(supabase: SupabaseClient, payload: RmsRecordPayload) {
  const { data, error } = await supabase
    .from("civilian_records")
    .insert({
      civilian_id: payload.civilianId,
      created_by: payload.createdBy || null,
      description: payload.description,
      metadata: payload.metadata ?? {},
      record_type: payload.recordType,
      title: payload.title,
      visibility: "officer",
    })
    .select()
    .single();

  if (error) throw error;
  return mapRecord(data as Row);
}
