import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { isAdminAccessAllowed } from "@/src/lib/adminAuth";

const ADMIN_ACCESS_COOKIE = "sb-access-token";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";

  if (!accessToken) {
    redirect("/login");
  }

  const isAllowed = await isAdminAccessAllowed(accessToken);

  if (!isAllowed) {
    redirect("/login");
  }

  return <AdminConsole />;
}
