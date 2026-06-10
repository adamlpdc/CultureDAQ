import { notFound } from "next/navigation";
import { TrendingDown, TrendingUp } from "lucide-react";
import { PriceChart } from "@/components/assets/price-chart";
import { PriceEvents } from "@/components/assets/price-events";
import { TradeForm } from "@/components/trading/trade-form";
import { Badge, FeaturedBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetAvatarFromAsset } from "@/components/assets/asset-avatar";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import {
  getAssetBySlug,
  getAssetPriceHistory,
  getCurrentUser,
  getPriceEvents,
  getProfile,
  getUserHolding,
} from "@/lib/queries";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

interface AssetPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { slug } = await params;
  const asset = await getAssetBySlug(slug);

  if (!asset) notFound();

  const [priceHistory, priceEvents, user] = await Promise.all([
    getAssetPriceHistory(asset.id),
    getPriceEvents(asset.id),
    getCurrentUser(),
  ]);

  const profile = user ? await getProfile(user.id) : null;
  const holding = user ? await getUserHolding(user.id, asset.id) : null;

  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <AssetAvatarFromAsset asset={asset} size="xl" />
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={CATEGORY_COLORS[asset.category]}>
                {CATEGORY_LABELS[asset.category]}
              </Badge>
              {asset.featured && <FeaturedBadge />}
              {asset.trading_paused && (
                <Badge className="border-loss-muted bg-loss-light text-loss">
                  Trading Paused
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {asset.name}
            </h1>
            {asset.description && (
              <p className="mt-2 max-w-2xl text-muted">{asset.description}</p>
            )}
            </div>
          </div>

          <div className="shrink-0 text-left md:text-right">
            <p className="text-stat text-3xl font-bold text-foreground md:text-4xl">
              {formatDaq(asset.current_price)}
            </p>
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-lg font-semibold md:justify-end",
                isPositive ? "bg-gain-light text-gain" : "bg-loss-light text-loss"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {formatPercent(change)}
            </div>
            {asset.trade_volume_24h > 0 && (
              <div className="mt-3 inline-block rounded-lg bg-surface-muted px-3 py-1.5 text-left md:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-light">
                  24h Volume
                </p>
                <p className="text-stat text-sm font-bold text-foreground-secondary">
                  {asset.trade_volume_24h.toLocaleString()} shares
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
            </CardHeader>
            <PriceChart data={priceHistory} currentPrice={asset.current_price} />
          </Card>

          <PriceEvents events={priceEvents} />
        </div>

        <div>
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
