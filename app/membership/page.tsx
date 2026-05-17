import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MembershipPortal } from "@/components/membership/MembershipPortal";

export default async function MembershipPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  return <MembershipPortal />;
}
