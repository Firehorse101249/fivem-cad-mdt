"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Template = { id: string; name: string };
type Item = { category: string; description: string | null; id: string; task: string; template_id: string };
type Profile = { display_name: string | null; email: string | null; id: string; role: string };
type Assignment = { fto_user_id: string | null; id: string; status: string; trainee_user_id: string };

export function FtoAdmin() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [traineeId, setTraineeId] = useState("");
  const [ftoId, setFtoId] = useState("");
  const [task, setTask] = useState("");
  const [category, setCategory] = useState("Agency Specific");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/fto");
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to load FTO admin data.");
      return;
    }
    setTemplates(result.templates ?? []);
    setItems(result.items ?? []);
    setProfiles(result.profiles ?? []);
    setAssignments(result.assignments ?? []);
    setTemplateId((current) => current || result.templates?.[0]?.id || "");
    setError("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedItems = useMemo(() => items.filter((item) => item.template_id === templateId), [items, templateId]);

  function label(profile?: Profile) {
    return profile?.display_name ?? profile?.email ?? profile?.id ?? "Unknown";
  }

  async function createAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/fto", {
      body: JSON.stringify({ action: "create_assignment", fto_user_id: ftoId, template_id: templateId, trainee_user_id: traineeId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to create assignment.");
      return;
    }
    setMessage("FTO assignment created.");
    await load();
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/fto", {
      body: JSON.stringify({ action: "create_item", category, description, task, template_id: templateId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to create checklist item.");
      return;
    }
    setTask("");
    setDescription("");
    setMessage("Checklist item added.");
    await load();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <h2 className="text-xl font-semibold text-white">FTO Assignments</h2>
        <form className="mt-4 space-y-3 rounded-md border border-white/10 bg-neutral-950 p-3" onSubmit={createAssignment}>
          <Select label="Template" onChange={setTemplateId} options={templates.map((template) => ({ label: template.name, value: template.id }))} value={templateId} />
          <Select label="Trainee" onChange={setTraineeId} options={profiles.map((profile) => ({ label: label(profile), value: profile.id }))} value={traineeId} />
          <Select label="FTO" onChange={setFtoId} options={profiles.map((profile) => ({ label: label(profile), value: profile.id }))} value={ftoId} />
          <button className="min-h-10 rounded-md bg-sky-400 px-4 text-sm font-semibold text-neutral-950 hover:bg-sky-300" type="submit">Create assignment</button>
        </form>
        <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
          {assignments.map((assignment) => (
            <article className="rounded-md border border-white/10 bg-neutral-950 p-3" key={assignment.id}>
              <p className="font-medium text-white">{label(profiles.find((profile) => profile.id === assignment.trainee_user_id))}</p>
              <p className="mt-1 text-sm text-neutral-400">FTO: {label(profiles.find((profile) => profile.id === assignment.fto_user_id))}</p>
              <p className="mt-1 text-xs text-neutral-500">{assignment.status}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-neutral-900 p-5">
        <h2 className="text-xl font-semibold text-white">Checklist Template</h2>
        <form className="mt-4 space-y-3 rounded-md border border-white/10 bg-neutral-950 p-3" onSubmit={createItem}>
          <Select label="Template" onChange={setTemplateId} options={templates.map((template) => ({ label: template.name, value: template.id }))} value={templateId} />
          <input className="h-10 w-full rounded-md border border-white/10 bg-neutral-900 px-3 text-sm text-white" onChange={(event) => setCategory(event.target.value)} placeholder="Category" value={category} />
          <input className="h-10 w-full rounded-md border border-white/10 bg-neutral-900 px-3 text-sm text-white" onChange={(event) => setTask(event.target.value)} placeholder="Task" required value={task} />
          <textarea className="min-h-24 w-full rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white" onChange={(event) => setDescription(event.target.value)} placeholder="Description" value={description} />
          <button className="min-h-10 rounded-md bg-sky-400 px-4 text-sm font-semibold text-neutral-950 hover:bg-sky-300" type="submit">Add item</button>
        </form>
        {message ? <p className="mt-4 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
        <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
          {selectedItems.map((item) => (
            <article className="rounded-md border border-white/10 bg-neutral-950 p-3" key={item.id}>
              <p className="text-xs uppercase tracking-[0.16em] text-sky-300">{item.category}</p>
              <p className="mt-1 font-medium text-white">{item.task}</p>
              <p className="mt-2 text-sm text-neutral-400">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Select({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      <select className="mt-2 h-10 w-full rounded-md border border-white/10 bg-neutral-900 px-3 text-sm text-white" onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Select</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
