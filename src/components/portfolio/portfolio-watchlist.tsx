"use client";

import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import type { Asset } from "@/types/database";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { CategoryBadge } from "@/components/ui/badge";
import { formatDaq, formatPercent, getPriceChange } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PortfolioWatchlistProps {
  suggestedAssets: Asset[];
}

export function PortfolioWatchlist({ suggestedAssets }: PortfolioWatchlistProps) {
  const [showHint, setShowHint] = useState(false);

  const revealHint = useCallback(() => {
    setShowHint(true);
    window.setTimeout(() => setShowHint(false), 2800);
  }, []);

  return (
    <Card className="!p-4 opacity-95 md:!p-5">
      <CardHeader className="mb-2">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-muted" />
          <CardTitle className="text-sm text-foreground-secondary">Watchlist</CardTitle>
        </div>
        <span className="rounded-md border border-border/80 bg-surface-muted/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
          Coming Soon
        </span>
      </CardHeader>
      <p className="mb-2.5 text-[11px] leading-relaxed text-muted">
        Track assets before you buy. Suggested picks:
      </p>
      <div className="space-y-1.5">
        {suggestedAssets.map((asset) => {
          const change = getPriceChange(asset.current_price, asset.previous_price);
          const isPositive = change >= 0;
          return (
            <div
              key={asset.id}
              className="flex items-center gap-2.5 rounded-lg border border-dashed border-border/70 bg-surface-muted/15 px-2.5 py-2"
            >
              <Link
                href={`/asset/${asset.slug}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 transition-colors hover:opacity-90"
              >
                <AssetIdentityFromAsset asset={asset} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    {asset.name}
                  </p>
                  <CategoryBadge size="xs" className="mt-0.5 w-fit" category={asset.category} />
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-stat daq-price text-[10px] font-medium text-foreground">
                    {formatDaq(asset.current_price)}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-semibold",
                      isPositive ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(change)}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={revealHint}
                aria-label="Add to watchlist — coming soon"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-surface text-muted transition-colors hover:border-border-tint hover:bg-surface-muted hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {showHint && (
        <p className="mt-2.5 text-center text-[11px] font-medium text-muted">
          Watchlists coming soon.
        </p>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="mt-2.5 w-full text-xs"
        onClick={revealHint}
      >
        Add to Watchlist
      </Button>
    </Card>
  );
}
