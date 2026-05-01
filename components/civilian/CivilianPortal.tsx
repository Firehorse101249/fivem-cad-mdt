"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/app/_lib/supabase-client";
import { emptyRecordCategories, mockCivilianCharacters } from "./mockCivilianData";
import {
  DEFAULT_CIVILIAN_PROFILE_LIMIT,
  licenseStatuses,
  licenseTypes,
  type CivilianFormState,
  type CivilianLicense,
  type CivilianProfile,
  type CivilianVehicle,
  type LicenseStatus,
  type LicenseType,
} from "./types";

const storageKey = "sentinel-civilian-portal-state";

const blankCharacterForm: CivilianFormState = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  height: "",
  weight: "",
  address: "",
  phone: "",
  occupation: "",
  emergency_contact: "",
  notes: "",
  profile_image_url: "",
};

const blankVehicle = {
  plate: "",
  make: "",
  model: "",
  color: "",
  year: "",
  vin: "",
  insurance_status: "Active",
  registration_status: "Valid",
  notes: "",
};

type PortalSection = "characters" | "create" | "details" | "licenses" | "vehicles" | "records" | "images" | "settings";

const sections: { id: PortalSection; label: string }[] = [
  { id: "characters", label: "My Characters" },
  { id: "create", label: "Create Character" },
  { id: "details", label: "Character Details" },
  { id: "licenses", label: "Licenses" },
  { id: "vehicles", label: "Vehicles" },
  { id: "records", label: "Records" },
  { id: "images", label: "Images" },
  { id: "settings", label: "Settings" },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function buildDefaultLicenses(civilianId: string): CivilianLicense[] {
  return licenseTypes.map((licenseType) => ({
    id: makeId("lic"),
    civilian_id: civilianId,
    license_type: licenseType,
    status: "None",
  }));
}

function fullName(character: CivilianProfile) {
  return `${character.first_name} ${character.last_name}`.trim() || "Unnamed Civilian";
}

function formFromCharacter(character: CivilianProfile): CivilianFormState {
  return {
    first_name: character.first_name,
    last_name: character.last_name,
    date_of_birth: character.date_of_birth,
    gender: character.gender,
    height: character.height,
    weight: character.weight,
    address: character.address,
    phone: character.phone,
    occupation: character.occupation,
    emergency_contact: character.emergency_contact,
    notes: character.notes,
    profile_image_url: character.profile_image_url ?? "",
  };
}

function statusClass(status: string) {
  if (status === "Valid" || status === "Active") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  if (status === "Expired" || status === "Pending") return "border-amber-300/35 bg-amber-300/10 text-amber-100";
  if (status === "Suspended" || status === "Revoked") return "border-rose-300/40 bg-rose-400/10 text-rose-100";
  return "border-white/10 bg-white/[0.04] text-neutral-300";
}

export function CivilianPortal() {
  const [characters, setCharacters] = useState<CivilianProfile[]>(mockCivilianCharacters);
  const [activeCharacterId, setActiveCharacterId] = useState(mockCivilianCharacters[0]?.id ?? "");
  const [activeSection, setActiveSection] = useState<PortalSection>("characters");
  const [ownerId, setOwnerId] = useState("mock-user-local-session");
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState<CivilianFormState>(blankCharacterForm);
  const [vehicleForm, setVehicleForm] = useState(blankVehicle);
  const [notice, setNotice] = useState("Awaiting Supabase/FiveM integration");

  useEffect(() => {
    queueMicrotask(async () => {
      const supabase = getSupabaseBrowserClient();
      const userResult = await supabase?.auth.getUser();
      const nextOwnerId = userResult?.data.user?.id ?? "mock-user-local-session";
      setOwnerId(nextOwnerId);

      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as CivilianProfile[];
          setCharacters(parsed);
          setActiveCharacterId(parsed[0]?.id ?? "");
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      } else if (nextOwnerId !== "mock-user-local-session") {
        setCharacters((current) => current.map((character) => ({ ...character, owner_id: nextOwnerId })));
      }

      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(characters));
    }
  }, [characters, hydrated]);

  const activeCharacter = useMemo(
    () => characters.find((character) => character.id === activeCharacterId) ?? characters[0] ?? null,
    [activeCharacterId, characters],
  );

  const profileLimitReached = characters.length >= DEFAULT_CIVILIAN_PROFILE_LIMIT;

  function updateForm(field: keyof CivilianFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateActiveCharacter(patch: Partial<CivilianProfile>) {
    if (!activeCharacter) return;
    setCharacters((current) => current.map((character) => (character.id === activeCharacter.id ? { ...character, ...patch } : character)));
  }

  function createCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileLimitReached) {
      setNotice("Civilian profile limit reached.");
      return;
    }

    const civilianId = makeId("civ");
    const nextCharacter: CivilianProfile = {
      id: civilianId,
      owner_id: ownerId,
      ...form,
      images: {
        profile_photo_url: form.profile_image_url,
        driver_license_photo_url: "",
        vehicle_registration_photo_url: "",
        mugshot_url: "",
      },
      licenses: buildDefaultLicenses(civilianId),
      records: [],
      vehicles: [],
    };

    // These records are intended to be searchable by officer MDT and dispatch lookup modules.
    setCharacters((current) => [...current, nextCharacter]);
    setActiveCharacterId(civilianId);
    setActiveSection("details");
    setForm(formFromCharacter(nextCharacter));
    setNotice("Character saved locally. Supabase persistence is Awaiting Supabase/FiveM integration.");
  }

  function saveCharacterDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCharacter) return;

    updateActiveCharacter({
      ...form,
      profile_image_url: form.profile_image_url,
      images: {
        ...activeCharacter.images,
        profile_photo_url: form.profile_image_url,
      },
    });
    setNotice("Character details updated locally. Awaiting Supabase/FiveM integration.");
  }

  function loadCharacterIntoForm(character: CivilianProfile) {
    setForm(formFromCharacter(character));
  }

  function selectCharacter(character: CivilianProfile) {
    setActiveCharacterId(character.id);
    loadCharacterIntoForm(character);
    setActiveSection("details");
  }

  function updateLicense(licenseType: LicenseType, status: LicenseStatus) {
    if (!activeCharacter) return;
    // TODO: Officer/admin systems should later suspend, revoke, and update license enforcement.
    const licenses = activeCharacter.licenses.map((license) =>
      license.license_type === licenseType ? { ...license, status } : license,
    );
    updateActiveCharacter({ licenses });
    setNotice("License setup saved locally. Officer/admin enforcement is Under Construction.");
  }

  function createVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCharacter) return;

    const nextVehicle: CivilianVehicle = {
      id: makeId("veh"),
      civilian_id: activeCharacter.id,
      owner_id: ownerId,
      plate: vehicleForm.plate.trim().toUpperCase(),
      make: vehicleForm.make,
      model: vehicleForm.model,
      color: vehicleForm.color,
      year: vehicleForm.year ? Number(vehicleForm.year) : "",
      vin: vehicleForm.vin || "VIN pending",
      insurance_status: vehicleForm.insurance_status,
      registration_status: vehicleForm.registration_status,
      notes: vehicleForm.notes,
    };

    // These records are intended to be searchable by officer MDT and dispatch lookup modules.
    updateActiveCharacter({ vehicles: [...activeCharacter.vehicles, nextVehicle] });
    setVehicleForm(blankVehicle);
    setNotice("Vehicle added locally. Officer plate lookup connection is Awaiting Supabase/FiveM integration.");
  }

  if (!hydrated) {
    return <div className="rounded-lg border border-white/10 bg-neutral-900 p-6 text-neutral-300">Loading civilian portal...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Civilian Records Portal</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Character Management</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
              Create roleplay civilians, request license setup, manage vehicles, and review read-only records connected to future officer and dispatch lookup tools.
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <Metric label="Profiles" value={`${characters.length}/${DEFAULT_CIVILIAN_PROFILE_LIMIT}`} />
            <Metric label="Owner ID" value={ownerId === "mock-user-local-session" ? "Local session" : ownerId.slice(0, 8)} />
            <Metric label="Data Mode" value="Mock/local" />
          </div>
        </div>
        <Notice text={profileLimitReached ? "Civilian profile limit reached." : notice} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-white/10 bg-neutral-900 p-3">
          <nav className="grid gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  if (section.id === "details" && activeCharacter) loadCharacterIntoForm(activeCharacter);
                  if (section.id === "create") setForm(blankCharacterForm);
                  setActiveSection(section.id);
                }}
                className={`min-h-10 rounded-md px-3 text-left text-sm font-medium ${
                  activeSection === section.id
                    ? "bg-emerald-300 text-neutral-950"
                    : "text-neutral-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
          <div className="mt-4 rounded-md border border-white/10 bg-neutral-950 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Active Character</p>
            <p className="mt-2 text-sm font-semibold text-white">{activeCharacter ? fullName(activeCharacter) : "None selected"}</p>
            <p className="mt-1 font-mono text-xs text-neutral-500">{activeCharacter?.id ?? "No civilian id"}</p>
          </div>
        </aside>

        <main className="min-w-0">
          {activeSection === "characters" ? (
            <CharacterList
              characters={characters}
              onCreate={() => {
                setForm(blankCharacterForm);
                setActiveSection("create");
              }}
              onSelect={selectCharacter}
              profileLimitReached={profileLimitReached}
            />
          ) : null}

          {activeSection === "create" ? (
            <Panel title="Create Character">
              <CharacterForm
                form={form}
                onChange={updateForm}
                onSubmit={createCharacter}
                submitLabel="Create Character"
                disabled={profileLimitReached}
              />
              {profileLimitReached ? <Notice text="Civilian profile limit reached." /> : null}
            </Panel>
          ) : null}

          {activeSection === "details" ? (
            <Panel title="Character Details">
              {activeCharacter ? (
                <>
                  <CharacterSummary character={activeCharacter} />
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <CharacterForm form={form} onChange={updateForm} onSubmit={saveCharacterDetails} submitLabel="Save Details" />
                  </div>
                </>
              ) : (
                <EmptyState text="Create or select a civilian profile first." />
              )}
            </Panel>
          ) : null}

          {activeSection === "licenses" ? (
            <Panel title="Licenses">
              {activeCharacter ? <LicenseManager character={activeCharacter} onChange={updateLicense} /> : <EmptyState text="Create or select a civilian profile first." />}
            </Panel>
          ) : null}

          {activeSection === "vehicles" ? (
            <Panel title="Vehicles">
              {activeCharacter ? (
                <VehicleManager
                  character={activeCharacter}
                  form={vehicleForm}
                  onChange={(field, value) => setVehicleForm((current) => ({ ...current, [field]: value }))}
                  onSubmit={createVehicle}
                />
              ) : (
                <EmptyState text="Create or select a civilian profile first." />
              )}
            </Panel>
          ) : null}

          {activeSection === "records" ? (
            <Panel title="Records">
              {activeCharacter ? <RecordsView character={activeCharacter} /> : <EmptyState text="Create or select a civilian profile first." />}
            </Panel>
          ) : null}

          {activeSection === "images" ? (
            <Panel title="Images">
              {activeCharacter ? <ImagePlaceholders /> : <EmptyState text="Create or select a civilian profile first." />}
            </Panel>
          ) : null}

          {activeSection === "settings" ? (
            <Panel title="Settings">
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Profile Limit" value={`${DEFAULT_CIVILIAN_PROFILE_LIMIT} default civilian profiles`} />
                <Info label="Storage" value="Local browser state until Supabase is connected" />
                <Info label="Officer Lookup" value="Awaiting Supabase/FiveM integration" />
                <Info label="Admin Limits" value="Under Construction" />
              </div>
            </Panel>
          ) : null}
        </main>
      </section>
    </div>
  );
}

function CharacterList({
  characters,
  onCreate,
  onSelect,
  profileLimitReached,
}: {
  characters: CivilianProfile[];
  onCreate: () => void;
  onSelect: (character: CivilianProfile) => void;
  profileLimitReached: boolean;
}) {
  return (
    <Panel title="My Characters">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-400">Civilian profiles are owned by the logged-in user and stored locally until Supabase persistence is connected.</p>
        <button
          type="button"
          onClick={onCreate}
          disabled={profileLimitReached}
          className="min-h-11 rounded-md bg-emerald-300 px-4 text-sm font-bold text-neutral-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create Character
        </button>
      </div>
      {profileLimitReached ? <Notice text="Civilian profile limit reached." /> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {characters.map((character) => (
          <button
            key={character.id}
            type="button"
            onClick={() => onSelect(character)}
            className="rounded-md border border-white/10 bg-neutral-950 p-4 text-left transition hover:border-emerald-300/40 hover:bg-white/[0.05]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{fullName(character)}</h2>
                <p className="mt-1 text-sm text-neutral-400">{character.date_of_birth || "No date of birth"} / {character.occupation || "No occupation"}</p>
              </div>
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-xs text-neutral-300">
                {character.id}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Info label="Licenses" value={String(character.licenses.filter((license) => license.status !== "None").length)} />
              <Info label="Vehicles" value={String(character.vehicles.length)} />
              <Info label="Records" value={String(character.records.length)} />
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function CharacterForm({
  disabled = false,
  form,
  onChange,
  onSubmit,
  submitLabel,
}: {
  disabled?: boolean;
  form: CivilianFormState;
  onChange: (field: keyof CivilianFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
      <TextInput label="First name" required value={form.first_name} onChange={(value) => onChange("first_name", value)} />
      <TextInput label="Last name" required value={form.last_name} onChange={(value) => onChange("last_name", value)} />
      <TextInput label="Date of birth" type="date" required value={form.date_of_birth} onChange={(value) => onChange("date_of_birth", value)} />
      <TextInput label="Gender" value={form.gender} onChange={(value) => onChange("gender", value)} placeholder="Male, female, non-binary, other" />
      <TextInput label="Height" value={form.height} onChange={(value) => onChange("height", value)} placeholder="5'10&quot;" />
      <TextInput label="Weight" value={form.weight} onChange={(value) => onChange("weight", value)} placeholder="180 lb" />
      <TextInput label="Address" value={form.address} onChange={(value) => onChange("address", value)} />
      <TextInput label="Phone number" value={form.phone} onChange={(value) => onChange("phone", value)} placeholder="555-0100" />
      <TextInput label="Occupation" value={form.occupation} onChange={(value) => onChange("occupation", value)} />
      <TextInput label="Emergency contact" value={form.emergency_contact} onChange={(value) => onChange("emergency_contact", value)} />
      <label className="block lg:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Notes</span>
        <textarea
          value={form.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          className="mt-2 min-h-28 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-emerald-300"
          placeholder="Civilian RP setup notes"
        />
      </label>
      <div className="lg:col-span-2">
        <UploadPlaceholder title="Profile image/avatar upload placeholder" />
        <TextInput label="Profile image URL placeholder" value={form.profile_image_url} onChange={(value) => onChange("profile_image_url", value)} />
      </div>
      <div className="lg:col-span-2">
        <button
          type="submit"
          disabled={disabled}
          className="min-h-11 rounded-md bg-emerald-300 px-4 text-sm font-bold text-neutral-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function CharacterSummary({ character }: { character: CivilianProfile }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Info label="Civilian ID" value={character.id} />
      <Info label="Owner ID" value={character.owner_id} />
      <Info label="Name" value={fullName(character)} />
      <Info label="Date of Birth" value={character.date_of_birth || "Not set"} />
      <Info label="Address" value={character.address || "Not set"} />
      <Info label="Phone" value={character.phone || "Not set"} />
      <Info label="Occupation" value={character.occupation || "Not set"} />
      <Info label="Lookup Shape" value="civilian id, owner_id, first_name, last_name, date_of_birth" />
    </div>
  );
}

function LicenseManager({ character, onChange }: { character: CivilianProfile; onChange: (licenseType: LicenseType, status: LicenseStatus) => void }) {
  return (
    <div>
      <Notice text="Civilians can select licenses for RP setup. Officer/admin suspension and revocation enforcement is Under Construction." />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {licenseTypes.map((licenseType) => {
          const license = character.licenses.find((item) => item.license_type === licenseType);
          return (
            <label key={licenseType} className="rounded-md border border-white/10 bg-neutral-950 p-3">
              <span className="text-sm font-semibold text-white">{licenseType}</span>
              <select
                value={license?.status ?? "None"}
                onChange={(event) => onChange(licenseType, event.target.value as LicenseStatus)}
                className="mt-3 h-10 w-full rounded-md border border-white/10 bg-neutral-900 px-3 text-sm text-white"
              >
                {licenseStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function VehicleManager({
  character,
  form,
  onChange,
  onSubmit,
}: {
  character: CivilianProfile;
  form: typeof blankVehicle;
  onChange: (field: keyof typeof blankVehicle, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="space-y-5">
      <Notice text="Vehicles are structured for future officer plate lookup. Awaiting Supabase/FiveM integration." />
      <div className="grid gap-3">
        {character.vehicles.length ? (
          character.vehicles.map((vehicle) => (
            <article key={vehicle.id} className="rounded-md border border-white/10 bg-neutral-950 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{vehicle.plate || "No plate"} / {vehicle.make} {vehicle.model}</h3>
                  <p className="mt-1 text-sm text-neutral-400">{vehicle.color} / {vehicle.year || "Year pending"} / {vehicle.vin}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-md border px-2 py-1 ${statusClass(vehicle.insurance_status)}`}>{vehicle.insurance_status} insurance</span>
                  <span className={`rounded-md border px-2 py-1 ${statusClass(vehicle.registration_status)}`}>{vehicle.registration_status} registration</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-neutral-400">{vehicle.notes || "No vehicle notes."}</p>
              <p className="mt-2 font-mono text-xs text-neutral-600">civilian_id: {vehicle.civilian_id} / owner_id: {vehicle.owner_id}</p>
            </article>
          ))
        ) : (
          <EmptyState text="No vehicles registered for this character." />
        )}
      </div>
      <form onSubmit={onSubmit} className="grid gap-4 border-t border-white/10 pt-5 lg:grid-cols-2">
        <TextInput label="Plate" required value={form.plate} onChange={(value) => onChange("plate", value)} />
        <TextInput label="Make" required value={form.make} onChange={(value) => onChange("make", value)} />
        <TextInput label="Model" required value={form.model} onChange={(value) => onChange("model", value)} />
        <TextInput label="Color" value={form.color} onChange={(value) => onChange("color", value)} />
        <TextInput label="Year" type="number" value={String(form.year)} onChange={(value) => onChange("year", value)} />
        <TextInput label="VIN placeholder" value={form.vin} onChange={(value) => onChange("vin", value)} placeholder="VIN pending" />
        <SelectInput label="Insurance status" value={form.insurance_status} onChange={(value) => onChange("insurance_status", value)} options={["Active", "Expired", "Suspended", "None"]} />
        <SelectInput label="Registration status" value={form.registration_status} onChange={(value) => onChange("registration_status", value)} options={["Valid", "Expired", "Suspended", "Revoked", "Pending"]} />
        <TextInput label="Registered owner/character" value={fullName(character)} onChange={() => undefined} disabled />
        <label className="block lg:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="lg:col-span-2">
          <button type="submit" className="min-h-11 rounded-md bg-emerald-300 px-4 text-sm font-bold text-neutral-950 hover:bg-emerald-200">
            Add Vehicle
          </button>
        </div>
      </form>
    </div>
  );
}

function RecordsView({ character }: { character: CivilianProfile }) {
  return (
    <div className="space-y-4">
      <Notice text="Records are read-only for civilians. Awaiting officer/dispatch database connection." />
      <div className="grid gap-3 md:grid-cols-2">
        {emptyRecordCategories.map((category) => {
          const records = character.records.filter((record) => record.record_type === category);
          return (
            <section key={category} className="rounded-md border border-white/10 bg-neutral-950 p-3">
              <h3 className="text-sm font-semibold text-white">{category}</h3>
              {records.length ? (
                <div className="mt-3 space-y-2">
                  {records.map((record) => (
                    <article key={record.id} className="rounded-md border border-white/10 bg-neutral-900 p-3">
                      <p className="text-sm font-medium text-neutral-100">{record.title}</p>
                      <p className="mt-1 text-sm text-neutral-400">{record.description}</p>
                      <p className="mt-2 font-mono text-xs text-neutral-600">{record.created_at}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-500">Awaiting officer/dispatch database connection.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ImagePlaceholders() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <UploadPlaceholder title="Civilian profile photo" />
      <UploadPlaceholder title="Driver license photo" />
      <UploadPlaceholder title="Vehicle registration photo placeholder" />
      <UploadPlaceholder title="Mugshot placeholder if applicable later" />
    </div>
  );
}

function UploadPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/15 bg-neutral-950 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-3 grid min-h-28 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-center text-sm text-neutral-500">
        Upload UI placeholder
      </div>
      <p className="mt-3 text-xs text-neutral-500">TODO: Supabase Storage integration.</p>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-neutral-950 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-1 break-words text-sm text-neutral-200">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-neutral-950 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-sm text-neutral-100">{value}</p>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <div className="mt-3 rounded-md border border-dashed border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-sm text-amber-100">{text}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-white/15 bg-neutral-950 px-3 py-8 text-center text-sm text-neutral-400">{text}</div>;
}

function TextInput({
  disabled = false,
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "date" | "number" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600 focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectInput({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white focus:border-emerald-300"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
