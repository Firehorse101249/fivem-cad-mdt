"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../_lib/supabase-client";

type TokenState = "checking" | "ready" | "error";

function getUrlTokens() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    accessToken: hash.get("access_token") ?? query.get("access_token"),
    code: query.get("code") ?? hash.get("code"),
    refreshToken: hash.get("refresh_token") ?? query.get("refresh_token"),
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [tokenState, setTokenState] = useState<TokenState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function prepareRecoverySession() {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        if (isActive) {
          setError("Supabase is not configured.");
          setTokenState("error");
        }
        return;
      }

      const { accessToken, code, refreshToken } = getUrlTokens();

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (!isActive) {
          return;
        }

        if (exchangeError) {
          setError(exchangeError.message);
          setTokenState("error");
          return;
        }

        setTokenState("ready");
        window.history.replaceState(null, "", "/reset-password");
        return;
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!isActive) {
          return;
        }

        if (sessionError) {
          setError(sessionError.message);
          setTokenState("error");
          return;
        }

        setTokenState("ready");
        window.history.replaceState(null, "", "/reset-password");
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (data.session) {
        setTokenState("ready");
      } else {
        setError("Reset link is missing or expired. Request a new password reset email.");
        setTokenState("error");
      }
    }

    void prepareRecoverySession();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" });
    setSuccess("Password updated. Redirecting to login.");

    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1200);
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
            Reset your password.
          </h1>
          <p className="mt-5 text-lg leading-8 text-neutral-300">
            Use the recovery link from your email to set a new password for your
            CAD/MDT account.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
          <div className="mb-8">
            <Link href="/login" className="text-sm font-medium text-sky-300 hover:text-sky-200">
              Back to login
            </Link>
            <h2 className="mt-5 text-3xl font-semibold text-white">New password</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Enter and confirm your new password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-neutral-300">New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                disabled={tokenState !== "ready" || isSubmitting}
                className="mt-2 h-12 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Minimum 6 characters"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-300">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                disabled={tokenState !== "ready" || isSubmitting}
                className="mt-2 h-12 w-full rounded-md border border-white/10 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Repeat password"
              />
            </label>

            {tokenState === "checking" ? (
              <div className="rounded-md border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-sm text-sky-100">
                Checking reset link.
              </div>
            ) : null}

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
              disabled={tokenState !== "ready" || isSubmitting}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-sky-400 px-4 py-3 font-semibold text-neutral-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Updating password" : "Update password"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
