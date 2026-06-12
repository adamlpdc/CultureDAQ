import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset, AssetRankMovement } from "@/types/database";
import { RankPill } from "@/components/assets/rank-movement";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge } from "@/components/ui/badge";
import { MarketStatusBadge } from "@/components/market/market-status-badge";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

function SectionHeader({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="mb-2.5 flex items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-0.5 text-[11px] text-muted">{description}</p>
      </div>
      <Link href={href} className="shrink-0 text-[11px] font-semibold text-primary hover:underline">
        View all
      </Link>
    </div>
  );
}

function TrendingSection({
  assets,
  rankMovementsMap,
}: {
  assets: Asset[];
  rankMovementsMap: Map<string, AssetRankMovement>;
}) {
  if (assets.length === 0) return null;

  return (
    <section className="rounded-xl border border-border/80 bg-surface-muted/20 p-3 md:p-4">
      <SectionHeader
        title="🔥 Trending Now"
        description="The assets getting the most attention right now."
        href="/market?sort=trending"
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {assets.slice(0, 6).map((asset) => {
          const change = getPriceChange(asset.current_price, asset.previous_price);
          const isPositive = change >= 0;
          const movement = rankMovementsMap.get(asset.id);
          return (
            <Link
              key={asset.id}
              href={`/asset/${asset.slug}`}
              className="group relative flex flex-col rounded-lg border border-border/80 bg-surface p-2.5 transition-all hover:border-border-tint hover:shadow-card"
            >
              {movement && !movement.isNewlyRanked && (
                <RankPill rank={movement.rank} className="absolute right-2 top-2" />
              )}
              <div className="flex items-center gap-1.5 pr-8">
                <AssetIdentityFromAsset asset={asset} size="xs" />
                <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground group-hover:text-primary">
                  {asset.name}
                </p>
              </div>
              <CategoryBadge size="xs" className="mt-1 w-fit" category={asset.category} />
              <div className="mt-1.5 flex items-center justify-between gap-1 pt-1">
                <p className="text-stat daq-price text-[11px] font-bold text-foreground">
                  {formatDaq(asset.current_price)}
                </p>
                <p
                  className={cn(
                    "flex items-center gap-0.5 text-[10px] font-bold",
                    isPositive ? "text-gain" : "text-loss"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {formatPercent(change)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MoverLeaderboard({
  title,
  description,
  href,
  assets,
  variant,
}: {
  title: string;
  description: string;
  href: string;
  assets: Asset[];
  variant: "gain" | "loss";
}) {
  if (assets.length === 0) return null;

  const isGain = variant === "gain";

  return (
    <section className="rounded-xl border border-border/80 bg-surface-muted/20 p-3 md:p-4">
      <SectionHeader title={title} description={description} href={href} />
      <div className="flex flex-col gap-2">
        {assets.slice(0, 5).map((asset, index) => {
          const change = getPriceChange(asset.current_price, asset.previous_price);
          const isPositive = change >= 0;
          return (
            <Link
              key={asset.id}
              href={`/asset/${asset.slug}`}
              className="group flex flex-col rounded-lg border border-border/80 bg-surface p-2.5 transition-all hover:border-border-tint hover:shadow-card"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-stat flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
                    isGain
                      ? "bg-gain-light text-gain"
                      : "bg-loss-light text-loss"
                  )}
                >
                  {index + 1}
                </span>
                <AssetIdentityFromAsset asset={asset} size="sm" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
                    {asset.name}
                  </p>
                  <CategoryBadge size="xs" className="mt-0.5 w-fit" category={asset.category} />
                </div>
              </div>
              <div className="mt-2 flex items-end justify-between gap-2 border-t border-border/50 pt-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Price
                  </p>
                  <p className="text-stat daq-price text-[11px] font-bold text-foreground">
                    {formatDaq(asset.current_price)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    24H
                  </p>
                  <p
                    className={cn(
                      "flex items-center justify-end gap-0.5 text-[11px] font-bold",
                      isPositive ? "text-gain" : "text-loss"
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatPercent(change)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NewListingsSection({ assets }: { assets: Asset[] }) {
  if (assets.length === 0) return null;

  return (
    <section className="rounded-xl border border-dashed border-primary-muted/60 bg-primary-light/20 p-3 md:p-4">
      <SectionHeader
        title="🆕 New Listings"
        description="Fresh assets — early opportunities on the market."
        href="/market?sort=new_listings"
      />
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {assets.map((asset) => {
          const change = getPriceChange(asset.current_price, asset.previous_price);
          const isPositive = change >= 0;
          return (
            <Link
              key={asset.id}
              href={`/asset/${asset.slug}`}
              className="flex w-[160px] shrink-0 flex-col rounded-xl border border-dashed border-primary-muted/50 bg-surface p-3 transition-all hover:border-primary-muted hover:shadow-card"
            >
              <MarketStatusBadge status="new_listing" size="sm" className="w-fit" />
              <div className="mt-2 flex items-center gap-2">
                <AssetIdentityFromAsset asset={asset} size="sm" />
                <p className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                  {asset.name}
                </p>
              </div>
              <CategoryBadge size="xs" className="mt-2 w-fit" category={asset.category} />
              <div className="mt-auto flex items-center justify-between pt-2">
                <p className="text-stat daq-price text-[11px] font-bold text-foreground">
                  {formatDaq(asset.current_price)}
                </p>
                <p
                  className={cn(
                    "text-[10px] font-bold",
                    isPositive ? "text-gain" : "text-loss"
                  )}
                >
                  {formatPercent(change)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MostTradedTable({ assets }: { assets: Asset[] }) {
  if (assets.length === 0) return null;

  return (
    <section className="rounded-xl border border-border/80 bg-surface p-3 md:p-4">
      <SectionHeader
        title="💰 Most Traded"
        description="Where the action is — highest trading activity."
        href="/market?sort=most_traded"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-xs">
          <thead>
            <tr className="border-b border-border/60 text-[10px] font-bold uppercase tracking-wide text-muted">
              <th className="pb-2 pr-2">#</th>
              <th className="pb-2 pr-2">Asset</th>
              <th className="pb-2 pr-2 text-right">24H Trades</th>
              <th className="pb-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {assets.slice(0, 5).map((asset, index) => (
              <tr key={asset.id} className="group">
                <td className="py-2.5 pr-2 font-bold text-muted">{index + 1}</td>
                <td className="py-2.5 pr-2">
                  <Link
                    href={`/asset/${asset.slug}`}
                    className="flex items-center gap-2 transition-colors group-hover:text-primary"
                  >
                    <AssetIdentityFromAsset asset={asset} size="xs" />
                    <span className="truncate font-semibold text-foreground group-hover:text-primary">
                      {asset.name}
                    </span>
                  </Link>
                </td>
                <td className="py-2.5 pr-2 text-right font-bold text-foreground-secondary">
                  {asset.trade_volume_24h.toLocaleString()}
                </td>
                <td className="py-2.5 text-right">
                  <Link href={`/asset/${asset.slug}`} className="text-stat daq-price font-bold text-foreground">
                    {formatDaq(asset.current_price)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface MarketDiscoveryProps {
  trending: Asset[];
  gainers: Asset[];
  losers: Asset[];
  newListings: Asset[];
  mostTraded: Asset[];
  rankMovementsMap: Map<string, AssetRankMovement>;
}

export function MarketDiscovery({
  trending,
  gainers,
  losers,
  newListings,
  mostTraded,
  rankMovementsMap,
}: MarketDiscoveryProps) {
  return (
    <div className="space-y-3.5">
      <div className="border-b border-border/60 pb-3">
        <h2 className="text-sm font-bold text-foreground">Discovery Opportunities</h2>
        <p className="mt-0.5 text-xs text-muted">
          What is happening — and what should you look at next?
        </p>
      </div>

      <TrendingSection assets={trending} rankMovementsMap={rankMovementsMap} />

      <div className="grid gap-4 md:grid-cols-2">
        <MoverLeaderboard
          title="🚀 Top Gainers"
          description="Biggest price moves up today."
          href="/market?sort=gainers"
          assets={gainers}
          variant="gain"
        />
        <MoverLeaderboard
          title="📉 Top Losers"
          description="Biggest price moves down today."
          href="/market?sort=losers"
          assets={losers}
          variant="loss"
        />
      </div>

      <NewListingsSection assets={newListings} />
      <MostTradedTable assets={mostTraded} />
    </div>
  );
}
