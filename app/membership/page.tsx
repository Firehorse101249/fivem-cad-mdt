import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { MembershipPortal } from "@/components/membership/MembershipPortal";
import { getUserPermissions } from "@/src/lib/permissions";

export default async function MembershipPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { data } = await supabase.auth.getUser(accessToken);

    if (data.user) {
      const permissions = await getUserPermissions(data.user.id);
      if (permissions.has("cad:access")) {
        redirect("/cad");
      }
    }
  }

  return <MembershipPortal />;
}
