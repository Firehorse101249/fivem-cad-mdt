import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-dashboard/AdminShell";
import { isAdminAccessAllowed } from "@/src/lib/adminAuth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value ?? "";

  if (!accessToken || !(await isAdminAccessAllowed(accessToken))) {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
