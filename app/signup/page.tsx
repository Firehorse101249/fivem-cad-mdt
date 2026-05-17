"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SignupResponse = {
  success: boolean;
  error?: string;
  message?: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName,
        }),
      });

      const result = (await response.json()) as SignupResponse;

      if (!response.ok || !result.success) {
        setError(result.error ?? "Signup failed.");
        return;
      }

      setSuccess(result.message ?? "Account created. Redirecting to login.");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setError("Unable to reach the signup API route.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100 lg:grid-cols-[0.9fr_1fr]">
      <section className="hidden items-center justify-center border-r border-white/10 p-10 lg:flex">
        <div className="max-w-xl">
          <Link href="/" className="mb-10 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-md bg-sky-400/10 font-bold text-sky-200 ring-1 ring-sky-400/30">
              SC
            </span>
            <span className="text-xl font-semibold text-white">Sentinel CAD/MDT</span>
          </Link>
          <h1 className="text-5xl font-semibold leading-tight text-white">
            Create your website account.
          </h1>
          <p className="mt-5 text-lg leading-8 text-neutral-300">
            After signup, connect Discord and Steam, then submit your whitelist
            application from the membership portal.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center">
        <div className="w-full max-w-lg rounded-lg border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
          <div className="mb-8">
            <Link href="/login" className="text-sm font-medium text-sky-300 hover:text-sky-200">
              Already have an account?
            </Link>
            <h2 className="mt-5 text-3xl font-semibold text-white">Create account</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Steam and Discord linking happens after your account is created.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <TextInput label="Email" type="email" value={email} onChange={setEmail} placeholder="civilian@example.com" />
            <TextInput label="Display name" value={displayName} onChange={setDisplayName} placeholder="Jane Civilian" />
            <TextInput label="Password" type="password" value={password} onChange={setPassword} placeholder="Minimum 6 characters" minLength={6} />
            <TextInput label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat password" minLength={6} />

            {success ? (
              <div className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                {success}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-sky-400 px-4 py-3 font-semibold text-neutral-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating account" : "Sign up"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function TextInput({
  label,
  minLength,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  minLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "email" | "password" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={minLength}
        className="mt-2 h-12 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300"
        placeholder={placeholder}
      />
    </label>
  );
}
