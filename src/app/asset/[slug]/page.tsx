import { notFound } from "next/navigation";
import { AssetIdentityHeader } from "@/components/assets/asset-identity-header";
import { AssetMarketStats } from "@/components/assets/asset-market-stats";
import { CultureContext } from "@/components/assets/culture-context";
import { PriceChart } from "@/components/assets/price-chart";
import { RelatedAssets } from "@/components/assets/related-assets";
import { WhyItMoved } from "@/components/assets/why-it-moved";
import { TradeForm } from "@/components/trading/trade-form";
import { createClient } from "@/lib/supabase/server";
import { isAssetWatched } from "@/lib/watchlist";
import { getCultureMomentForSlug } from "@/lib/culture-context";
import {
  getAssetBySlug,
  getAssetMarketRank,
  getAssetPriceHistory,
  getActiveMarketEventsForAsset,
  getAssetRankMovementForPage,
  getCurrentUser,
  getPriceEvents,
  getProfile,
  getRelatedAssets,
  getUserHolding,
} from "@/lib/queries";

interface AssetPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { slug } = await params;
  const asset = await getAssetBySlug(slug);

  if (!asset) notFound();

  const cultureMoment = getCultureMomentForSlug(slug);

  const [priceHistory, priceEvents, marketEvents, relatedAssets, marketRank, rankMovement, user] =
    await Promise.all([
      getAssetPriceHistory(asset.id),
      getPriceEvents(asset.id),
      getActiveMarketEventsForAsset(asset.id),
      getRelatedAssets(asset, {
        cultureSlugs: cultureMoment ? [...cultureMoment.assetSlugs] : [],
        limit: 6,
      }),
      getAssetMarketRank(asset.id),
      getAssetRankMovementForPage(asset.id),
      getCurrentUser(),
    ]);

  const profile = user ? await getProfile(user.id) : null;
  const holding = user ? await getUserHolding(user.id, asset.id) : null;

  let isWatched = false;
  if (user) {
    const supabase = await createClient();
    isWatched = await isAssetWatched(supabase, user.id, asset.id);
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <AssetIdentityHeader
        asset={asset}
        marketRank={marketRank.rank}
        rankMovement={rankMovement}
        isWatched={isWatched}
        isLoggedIn={!!user}
      />
      <AssetMarketStats
        asset={asset}
        marketRank={marketRank.rank}
        totalAssets={marketRank.total}
        rankMovement={rankMovement}
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="space-y-4 lg:col-span-2 lg:space-y-5">
          <PriceChart data={priceHistory} currentPrice={asset.current_price} />
          <WhyItMoved
            asset={asset}
            events={priceEvents}
            marketEvents={marketEvents}
            cultureMoment={cultureMoment}
            rankMovement={rankMovement}
          />
          {cultureMoment && <CultureContext moment={cultureMoment} />}
          <RelatedAssets entries={relatedAssets} />
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <TradeForm
            asset={asset}
            daqBalance={profile?.daq_balance ?? 0}
            ownedShares={holding?.shares ?? 0}
            avgCost={holding?.avg_cost ?? 0}
            isLoggedIn={!!user}
          />
        </div>
      </div>
    </div>
  );
}
