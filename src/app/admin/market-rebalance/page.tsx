import { notFound, redirect } from "next/navigation";
import { MarketRebalancePreview } from "@/components/admin/market-rebalance-preview";
import { PageHeader } from "@/components/ui/page-header";
import { isMarketRebalanceEnabled } from "@/lib/env";
import { buildMarketRebalancePlan } from "@/lib/market-rebalance";
import { getAssets, getCurrentUser, getProfile } from "@/lib/queries";

export default async function MarketRebalancePage() {
  if (!isMarketRebalanceEnabled()) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin/market-rebalance");
  const profile = await getProfile(user.id);
  if (!profile?.is_admin) redirect("/");

  const assets = await getAssets({ sort: "price_desc" });
  const plan = buildMarketRebalancePlan(assets.map((asset) => ({
    id: asset.id,
    slug: asset.slug,
    name: asset.name,
    currentPrice: Number(asset.current_price),
    previousPrice: Number(asset.previous_price),
    totalSharesOutstanding: Number(asset.total_shares_outstanding),
  })));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Reset v1.0 Preview"
        description="Read-only market rebalance and full-player-reset preview. This page cannot apply the migration."
      />
      <MarketRebalancePreview plan={plan} />
    </div>
  );
}
