import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getAssets, getCurrentUser, getProfile } from "@/lib/queries";
import { isCultureIntelligenceEnabled, isCultureIntelligenceV1Enabled, isMarketRebalanceEnabled } from "@/lib/env";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin");

  const profile = await getProfile(user.id);
  if (!profile?.is_admin) redirect("/");

  const assets = await getAssets({ sort: "name" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Manage featured assets, trading pauses, and price overrides."
      />

      <p className="text-sm">
        <Link href="/admin/simulation" className="font-medium text-primary hover:underline">
          Open Attention Market Simulation →
        </Link>
      </p>

      {isCultureIntelligenceV1Enabled() && (
        <div className="rounded-xl border border-primary/30 bg-primary-light p-4">
          <p className="font-semibold text-foreground">Culture Intelligence Engine v1</p>
          <p className="mt-1 text-sm text-foreground-secondary">
            Create, verify, resolve and audit manual CultureEvents before they enter Market Engine v2.
          </p>
          <Link href="/admin/culture-events" className="mt-3 inline-block font-semibold text-primary hover:underline">
            Open Culture Intelligence Events →
          </Link>
        </div>
      )}

      {isCultureIntelligenceEnabled() && (
        <div className="space-y-2 text-sm">
          <p>
            <Link href="/admin/replay-lab" className="font-medium text-primary hover:underline">
              Open Replay & Balancing Lab →
            </Link>
          </p>
        </div>
      )}

      {isMarketRebalanceEnabled() && (
        <p className="text-sm">
          <Link href="/admin/market-rebalance" className="font-medium text-loss hover:underline">
            Review one-time Market Rebalance →
          </Link>
        </p>
      )}

      <AdminPanel assets={assets} />
    </div>
  );
}
