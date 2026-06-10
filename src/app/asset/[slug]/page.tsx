import { notFound } from "next/navigation";
import { TrendingDown, TrendingUp } from "lucide-react";
import { PriceChart } from "@/components/assets/price-chart";
import { PriceEvents } from "@/components/assets/price-events";
import { TradeForm } from "@/components/trading/trade-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={CATEGORY_COLORS[asset.category]}>
              {CATEGORY_LABELS[asset.category]}
            </Badge>
            {asset.featured && (
              <Badge className="bg-gold/20 text-gold border-gold/30">
                Featured
              </Badge>
            )}
            {asset.trading_paused && (
              <Badge className="bg-loss/20 text-loss border-loss/30">
                Trading Paused
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold">{asset.name}</h1>
          {asset.description && (
            <p className="mt-2 max-w-2xl text-muted">{asset.description}</p>
          )}
        </div>

        <div className="text-left md:text-right">
          <p className="text-3xl font-bold">{formatDaq(asset.current_price)}</p>
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-lg font-medium md:justify-end",
              isPositive ? "text-gain" : "text-loss"
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
            <p className="mt-1 text-sm text-muted">
              {asset.trade_volume_24h.toLocaleString()} shares traded (24h)
            </p>
          )}
        </div>
      </div>

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
