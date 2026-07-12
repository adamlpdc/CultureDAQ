import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getProfile } from "@/lib/queries";

const links = [
  ["Overview", "/admin"], ["Culture Events", "/admin/culture-events"],
  ["Market Controls", "/admin/market-controls"], ["Assets", "/admin/assets"],
  ["Engine Health", "/admin/engine-health"], ["Audit Logs", "/admin/audit-logs"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin");
  const profile = await getProfile(user.id);
  if (!profile?.is_admin) redirect("/");
  return <div className="space-y-6">
    <nav aria-label="Admin navigation" className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-2">
      {links.map(([label, href]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground-secondary hover:bg-primary-light hover:text-primary">{label}</Link>)}
    </nav>
    {children}
  </div>;
}
