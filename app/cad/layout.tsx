import { DashboardShell } from "../_components/DashboardShell";

export default function CadLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
