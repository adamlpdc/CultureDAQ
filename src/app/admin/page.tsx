import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [drafts, verified, active, resolved, control, latestRun] = await Promise.all([
    admin.from("culture_events").select("id", { count: "exact", head: true }).eq("status", "draft"),
    admin.from("culture_events").select("id", { count: "exact", head: true }).eq("is_verified", true),
    admin.from("culture_events").select("id", { count: "exact", head: true }).eq("is_verified", true).is("resolved_at", null),
    admin.from("culture_events").select("id", { count: "exact", head: true }).eq("status", "resolved").gte("resolved_at", sevenDaysAgo),
    admin.from("market_engine_controls").select("paused,pause_reason").eq("id", "production").single(),
    admin.from("market_engine_v2_runs").select("status,updated_count,skipped_count,started_at").order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const stats = [["Draft events", drafts.count ?? 0], ["Verified events", verified.count ?? 0], ["Active events", active.count ?? 0], ["Recently resolved", resolved.count ?? 0]] as const;
  return <div className="space-y-6">
    <PageHeader title="Admin Overview" description="Culture Intelligence, Market Engine v2 controls and operational health."/>
    <Card className="border-primary/30 bg-primary-light">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-bold">Culture Intelligence</h2><p className="text-sm text-foreground-secondary">Review AI suggestions or create manual events before verification and pricing.</p></div><div className="flex gap-2"><Link href="/admin/culture-events#suggested-events" className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary">Review Suggested Events</Link><Link href="/admin/culture-events#create-culture-event" className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">Create Culture Event</Link></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([label,value])=><div key={label} className="rounded-lg bg-surface p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div>
      <Link href="/admin/culture-events" className="mt-4 inline-block font-semibold text-primary hover:underline">Open Culture Events →</Link>
    </Card>
    <div className="grid gap-4 md:grid-cols-3">
      <Card><p className="text-xs text-muted">Market</p><p className="mt-1 text-lg font-bold">{control.data?.paused ? "Paused" : "Active"}</p><p className="text-sm text-muted">{control.data?.pause_reason ?? "Market Engine v2 scheduled normally"}</p><Link href="/admin/market-controls" className="mt-3 inline-block text-sm font-semibold text-primary">Market Controls →</Link></Card>
      <Card><p className="text-xs text-muted">Latest engine run</p><p className="mt-1 text-lg font-bold capitalize">{latestRun.data?.status ?? "No runs"}</p><p className="text-sm text-muted">{latestRun.data ? `${latestRun.data.updated_count} updated · ${latestRun.data.skipped_count} skipped` : "No audit data"}</p><Link href="/admin/engine-health" className="mt-3 inline-block text-sm font-semibold text-primary">Engine Health →</Link></Card>
      <Card><p className="text-xs text-muted">Asset operations</p><p className="mt-1 text-lg font-bold">Safe controls only</p><p className="text-sm text-muted">Featured status and per-asset trading pauses.</p><Link href="/admin/assets" className="mt-3 inline-block text-sm font-semibold text-primary">Manage Assets →</Link></Card>
    </div>
  </div>;
}
