import { notFound } from "next/navigation";
import { AssetIdentityHeader } from "@/components/assets/asset-identity-header";
import { AssetMarketStats } from "@/components/assets/asset-market-stats";
import { CultureContext } from "@/components/assets/culture-context";
import { PriceChart } from "@/components/assets/price-chart";
import { RelatedAssets } from "@/components/assets/related-assets";
import { WhyItMoved } from "@/components/assets/why-it-moved";
import { TradeForm } from "@/components/trading/trade-form";
import { getCultureMomentForSlug } from "@/lib/culture-context";
import {
  getAssetBySlug,
  getAssetMarketRank,
  getAssetPriceHistory,
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

  const [priceHistory, priceEvents, relatedAssets, marketRank, user] =
    await Promise.all([
      getAssetPriceHistory(asset.id),
      getPriceEvents(asset.id),
      getRelatedAssets(asset, {
        cultureSlugs: cultureMoment ? [...cultureMoment.assetSlugs] : [],
        limit: 6,
      }),
      getAssetMarketRank(asset.id),
      getCurrentUser(),
    ]);

  const profile = user ? await getProfile(user.id) : null;
  const holding = user ? await getUserHolding(user.id, asset.id) : null;

  return (
    <div className="space-y-4 md:space-y-5">
      <AssetIdentityHeader asset={asset} marketRank={marketRank.rank} />
      <AssetMarketStats
        asset={asset}
        marketRank={marketRank.rank}
        totalAssets={marketRank.total}
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="space-y-4 lg:col-span-2 lg:space-y-5">
          <PriceChart data={priceHistory} currentPrice={asset.current_price} />
          <WhyItMoved
            asset={asset}
            events={priceEvents}
            cultureMoment={cultureMoment}
          />
          {cultureMoment && <CultureContext moment={cultureMoment} />}
          <RelatedAssets entries={relatedAssets} />
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <TradeForm
            asset={asset}
            daqBalance={profile?.daq_balance ?? 0}
            ownedShares={holding?.shares ?? 0}
            isLoggedIn={!!user}
          />
        </div>
      </div>
    </div>
  );
}
