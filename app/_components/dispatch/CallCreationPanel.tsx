import type { NewCallForm, Priority, ServiceType } from "./types";
import { Panel, UnderConstructionInline } from "./Panel";
import { emsIncidentTypes, fireIncidentTypes } from "./mockData";

const priorities: Priority[] = ["Low", "Medium", "High", "Critical"];
const serviceTypes: ServiceType[] = ["Law Enforcement", "Fire", "EMS", "Tow", "Multi-agency"];
const lawIncidentTypes = ["Traffic stop", "Disturbance", "Robbery", "Welfare check", "MVA", "Shots fired"];
const towIncidentTypes = ["Tow request", "Impound", "Disabled vehicle", "Heavy wrecker", "Roadside assistance"];

function typeOptions(serviceType: ServiceType) {
  if (serviceType === "Fire") return fireIncidentTypes;
  if (serviceType === "EMS") return emsIncidentTypes;
  if (serviceType === "Tow") return towIncidentTypes;
  if (serviceType === "Multi-agency") return [...lawIncidentTypes, ...fireIncidentTypes, ...emsIncidentTypes];
  return lawIncidentTypes;
}

export function CallCreationPanel({
  form,
  onChange,
  onSubmit,
}: {
  form: NewCallForm;
  onChange: (patch: Partial<NewCallForm>) => void;
  onSubmit: () => void;
}) {
  const options = typeOptions(form.serviceType);

  return (
    <Panel title="Create Call" eyebrow="Intake">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-neutral-400">Service</span>
            <select
              value={form.serviceType}
              onChange={(event) => onChange({ serviceType: event.target.value as ServiceType, type: "" })}
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-neutral-950 px-2 text-sm text-white"
            >
              {serviceTypes.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-400">Priority</span>
            <select
              value={form.priority}
              onChange={(event) => onChange({ priority: event.target.value as Priority })}
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-neutral-950 px-2 text-sm text-white"
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-neutral-400">Call type</span>
          <select
            value={form.type}
            onChange={(event) => onChange({ type: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-neutral-950 px-2 text-sm text-white"
            required
          >
            <option value="">Select incident type</option>
            {options.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-[1fr_0.45fr]">
          <TextField label="Location" value={form.location} onChange={(value) => onChange({ location: value })} />
          <TextField label="Postal / Area" value={form.postal} onChange={(value) => onChange({ postal: value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Caller name" value={form.callerName} onChange={(value) => onChange({ callerName: value })} />
          <TextField label="Caller phone" value={form.callerPhone} onChange={(value) => onChange({ callerPhone: value })} />
        </div>
        <TextField label="Involved persons" value={form.involvedPersons} onChange={(value) => onChange({ involvedPersons: value })} />
        <TextField label="Involved vehicles" value={form.involvedVehicles} onChange={(value) => onChange({ involvedVehicles: value })} />
        <label className="block">
          <span className="text-xs font-medium text-neutral-400">Description</span>
          <textarea
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
            className="mt-1 min-h-24 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600"
            placeholder="Initial caller narrative, safety notes, injuries, hazards..."
            required
          />
        </label>
        <UnderConstructionInline label="Supabase dispatch_calls insert is prepared for future RLS-backed persistence" />
        <button
          type="submit"
          className="min-h-11 w-full rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-300"
        >
          Create Local Call
        </button>
      </form>
    </Panel>
  );
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600"
      />
    </label>
  );
}
