"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Asset, AssetRankMovement } from "@/types/database";
import type { WatchlistAnalytics, WatchlistItemWithAsset } from "@/lib/watchlist";
import {
  buildWatchlistMovers,
  formatMoverRankChange,
  formatWatchlistCount,
  formatWatchlistCountShort,
  formatWatchingSince,
  type WatchlistMoverEntry,
} from "@/lib/watchlist-events";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { WatchButton } from "@/components/watchlist/watch-button";
import { WatchlistEmptySuggestions } from "@/components/watchlist/watchlist-empty-suggestions";
import { CategoryBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

type WatchlistSort = "date_added" | "price_desc" | "price_asc" | "change_desc" | "change_asc" | "rank";

interface WatchlistPageContentProps {
  items: WatchlistItemWithAsset[];
  analytics: WatchlistAnalytics;
  rankMovements: Record<string, AssetRankMovement>;
  suggestedAssets?: Asset[];
  watchedAssetIds?: string[];
  isLoggedIn?: boolean;
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface-muted/30 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="text-stat mt-1 text-sm font-bold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function MoverRow({ entry }: { entry: WatchlistMoverEntry }) {
  const { item, movement, priceChange, event } = entry;
  const isPositive = priceChange >= 0;
  const rankChangeLabel = event?.displayLabel ?? formatMoverRankChange(movement);

  return (
    <Link
      href={`/asset/${item.asset.slug}`}
      className="flex items-center gap-3 rounded-xl border border-border/80 bg-surface-muted/20 px-3 py-2.5 transition-colors hover:border-border-tint hover:bg-surface-muted/40"
    >
      <AssetIdentityFromAsset asset={item.asset} size="xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.asset.name}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-right">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted">Rank</p>
          <p className="text-sm font-bold tabular-nums text-foreground">
            {movement ? `#${movement.rank}` : "—"}
          </p>
        </div>
        <div className="min-w-[3rem]">
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted">Move</p>
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              rankChangeLabel
                ? event?.isPositive === false
                  ? "text-loss"
                  : event || (movement?.rankChange ?? 0) > 0
                    ? "text-gain"
                    : (movement?.rankChange ?? 0) < 0
                      ? "text-loss"
                      : "text-muted"
                : "text-muted"
            )}
          >
            {rankChangeLabel ?? "—"}
          </p>
        </div>
        <div className="min-w-[3.5rem]">
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted">24H</p>
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              isPositive ? "text-gain" : "text-loss"
            )}
          >
            {formatPercent(priceChange)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function WatchlistPageContent({
  items,
  analytics,
  rankMovements,
  suggestedAssets = [],
  watchedAssetIds = [],
  isLoggedIn = true,
}: WatchlistPageContentProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<WatchlistSort>("date_added");

  const movementMap = useMemo(
    () => new Map(Object.entries(rankMovements)),
    [rankMovements]
  );

  const movers = useMemo(
    () => buildWatchlistMovers(items, movementMap),
    [items, movementMap]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter(
        (item) =>
          item.asset.name.toLowerCase().includes(q) ||
          item.asset.slug.includes(q)
      );
    }

    return [...list].sort((a, b) => {
      switch (sort) {
        case "price_desc":
          return b.asset.current_price - a.asset.current_price;
        case "price_asc":
          return a.asset.current_price - b.asset.current_price;
        case "change_desc":
          return (
            getPriceChange(b.asset.current_price, b.asset.previous_price) -
            getPriceChange(a.asset.current_price, a.asset.previous_price)
          );
        case "change_asc":
          return (
            getPriceChange(a.asset.current_price, a.asset.previous_price) -
            getPriceChange(b.asset.current_price, b.asset.previous_price)
          );
        case "rank": {
          const ra = movementMap.get(a.asset_id)?.rank ?? 999;
          const rb = movementMap.get(b.asset_id)?.rank ?? 999;
          return ra - rb;
        }
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
  }, [items, search, sort, movementMap]);

  if (items.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Watchlist"
          description="Track assets before you trade."
        />
        <WatchlistEmptySuggestions
          suggestions={suggestedAssets}
          watchedAssetIds={watchedAssetIds}
          isLoggedIn={isLoggedIn}
        />
      </div>
    );
  }

  const highestRank = analytics.highestRanked
    ? movementMap.get(analytics.highestRanked.asset_id)?.rank
    : undefined;

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Watchlist"
          description="Track assets before you trade."
        />
        <p className="shrink-0 rounded-xl border border-primary/20 bg-primary-light/40 px-3.5 py-2 text-sm font-bold text-primary">
          {formatWatchlistCount(analytics.count)}
        </p>
      </div>

      {analytics.showMoverComparison ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            label="Assets Tracked"
            value={analytics.count}
            sub={formatWatchlistCountShort(analytics.count)}
          />
          <StatTile
            label="Biggest Gainer"
            value={analytics.biggestGainer?.asset.name ?? "—"}
            sub={
              analytics.biggestGainer
                ? formatPercent(
                    getPriceChange(
                      analytics.biggestGainer.asset.current_price,
                      analytics.biggestGainer.asset.previous_price
                    )
                  )
                : undefined
            }
          />
          <StatTile
            label="Biggest Loser"
            value={analytics.biggestLoser?.asset.name ?? "—"}
            sub={
              analytics.biggestLoser
                ? formatPercent(
                    getPriceChange(
                      analytics.biggestLoser.asset.current_price,
                      analytics.biggestLoser.asset.previous_price
                    )
                  )
                : undefined
            }
          />
          <StatTile
            label="Highest Ranked"
            value={analytics.highestRanked?.asset.name ?? "—"}
            sub={highestRank != null ? `#${highestRank}` : undefined}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card md:p-5">
          <h2 className="text-sm font-bold text-foreground">Watchlist Summary</h2>
          <p className="mt-0.5 text-[11px] text-muted">{formatWatchlistCountShort(analytics.count)}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <StatTile label="Assets Tracked" value={analytics.count} />
            <StatTile
              label="Highest Ranked Asset"
              value={analytics.highestRanked?.asset.name ?? "—"}
              sub={highestRank != null ? `#${highestRank}` : undefined}
            />
            <StatTile
              label="Best Performing Asset"
              value={analytics.bestPerforming?.asset.name ?? "—"}
              sub={
                analytics.bestPerforming
                  ? formatPercent(
                      getPriceChange(
                        analytics.bestPerforming.asset.current_price,
                        analytics.bestPerforming.asset.previous_price
                      )
                    )
                  : undefined
              }
            />
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card md:p-5">
        <h2 className="text-sm font-bold text-foreground">Watchlist Movers</h2>
        <p className="mt-0.5 text-[11px] text-muted">
          What changed since you last checked.
        </p>
        <div className="mt-3 space-y-2">
          {movers.map((entry) => (
            <MoverRow key={entry.item.id} entry={entry} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card md:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-semibold text-muted">
            {formatWatchlistCountShort(items.length)}
          </p>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative max-w-sm flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <Input
                placeholder="Search watchlist..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as WatchlistSort)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground"
            >
              <option value="date_added">Date Added</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="change_desc">24H Change: Best</option>
              <option value="change_asc">24H Change: Worst</option>
              <option value="rank">Market Rank</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((item) => {
            const change = getPriceChange(
              item.asset.current_price,
              item.asset.previous_price
            );
            const isPositive = change >= 0;
            const movement = movementMap.get(item.asset_id) ?? null;
            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-border/80 bg-surface-muted/20 p-3 sm:flex-row sm:items-center"
              >
                <Link
                  href={`/asset/${item.asset.slug}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <AssetIdentityFromAsset asset={item.asset} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.asset.name}
                    </p>
                    <CategoryBadge size="xs" className="mt-1 w-fit" category={item.asset.category} />
                    <p className="mt-1 text-[10px] text-muted-light">
                      Watching since {formatWatchingSince(item.created_at)}
                    </p>
                  </div>
                </Link>
                <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase text-muted">Price</p>
                    <p className="text-stat text-sm font-bold text-foreground">
                      {formatDaq(item.asset.current_price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase text-muted">24H</p>
                    <p
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        isPositive ? "text-gain" : "text-loss"
                      )}
                    >
                      {formatPercent(change)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase text-muted">Rank</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {movement ? `#${movement.rank}` : "—"}
                    </p>
                  </div>
                  <WatchButton
                    assetId={item.asset_id}
                    initialWatched
                    isLoggedIn
                    variant="default"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
