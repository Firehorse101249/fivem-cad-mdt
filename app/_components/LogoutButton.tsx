"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "../_lib/supabase-client";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      await supabase.auth.signOut();
    }

    await fetch("/api/auth/session", {
      method: "DELETE",
    });

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-rose-300" />
      {isLoggingOut ? "Signing out" : "Logout"}
    </button>
  );
}
