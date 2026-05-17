"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "../_lib/supabase-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.",
      );
      setIsSubmitting(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: data.session.access_token,
          expiresIn: data.session.expires_in,
        }),
      });

      if (!sessionResponse.ok) {
        setError("Signed in, but the server session could not be created.");
        setIsSubmitting(false);
        return;
      }
    }

    let destination = "/membership";
    try {
      const landingResponse = await fetch("/api/auth/landing");
      const landing = (await landingResponse.json()) as { destination?: string; success?: boolean };
      if (landingResponse.ok && landing.success && landing.destination) {
        destination = landing.destination;
      }
    } catch {
      destination = "/membership";
    }

    router.push(destination);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100 lg:grid-cols-[1fr_0.85fr]">
      <section className="hidden items-center justify-center border-r border-white/10 p-10 lg:flex">
        <div className="max-w-xl">
          <Link href="/" className="mb-10 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-md bg-sky-400/10 font-bold text-sky-200 ring-1 ring-sky-400/30">
              SC
            </span>
            <span className="text-xl font-semibold text-white">Sentinel CAD/MDT</span>
          </Link>
          <h1 className="text-5xl font-semibold leading-tight text-white">
            Sign in to the operations console.
          </h1>
          <p className="mt-5 text-lg leading-8 text-neutral-300">
            Authenticated users are redirected to the CAD dashboard for dispatch,
            officer tools, records, and report workflows.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {["Dispatch", "Records", "Reports"].map((item) => (
              <div key={item} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-4 size-2 rounded-full bg-emerald-300" />
                <p className="text-sm font-medium text-neutral-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
          <div className="mb-8">
            <Link href="/" className="text-sm font-medium text-sky-300 hover:text-sky-200">
              Back to landing
            </Link>
            <h2 className="mt-5 text-3xl font-semibold text-white">Login</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Use your department email and password.
            </p>
            <p className="mt-3 text-sm text-neutral-400">
              Need civilian access?{" "}
              <Link href="/signup" className="font-medium text-sky-300 hover:text-sky-200">
                Create an account
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-neutral-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="mt-2 h-12 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300"
                placeholder="officer@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-300">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="mt-2 h-12 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300"
                placeholder="Your password"
              />
            </label>

            {error ? (
              <div className="rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-sky-400 px-4 py-3 font-semibold text-neutral-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-neutral-950" />
              {isSubmitting ? "Signing in" : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
