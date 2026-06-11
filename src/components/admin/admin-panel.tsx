"use client";

import { useState, useTransition } from "react";
import {
  backfillCurrentAssetRanks,
  generateCurrentMarketEvents,
  toggleAssetFeatured,
  toggleAssetTrading,
  updateAssetPrice,
} from "@/actions/admin";
import type { Asset } from "@/types/database";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDaq } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AdminPanelProps {
  assets: Asset[];
}

export function AdminPanel({ assets }: AdminPanelProps) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const filtered = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.slug.includes(search.toLowerCase())
  );

  function handleToggleFeatured(assetId: string, current: boolean) {
    startTransition(async () => {
      await toggleAssetFeatured(assetId, !current);
      setMessage("Featured status updated");
    });
  }

  function handleToggleTrading(assetId: string, current: boolean) {
    startTransition(async () => {
      await toggleAssetTrading(assetId, !current);
      setMessage("Trading status updated");
    });
  }

  function handleBackfillRanks() {
    startTransition(async () => {
      try {
        const result = await backfillCurrentAssetRanks();
        setMessage(`Rank backfill complete — ${result.recorded} snapshots recorded`);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Rank backfill failed");
      }
    });
  }

  function handleGenerateMarketEvents() {
    startTransition(async () => {
      try {
        const result = await generateCurrentMarketEvents();
        setMessage(
          `Market events generated — ${result.generated} created, ${result.skipped} skipped`
        );
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Market event generation failed");
      }
    });
  }

  function handlePriceOverride(assetId: string, price: string) {
    const num = parseFloat(price);
    if (isNaN(num) || num <= 0) {
      setMessage("Invalid price");
      return;
    }
    startTransition(async () => {
      try {
        await updateAssetPrice(assetId, num);
        setMessage("Price updated");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Error updating price");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search assets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {message && (
        <div className="rounded-xl border border-gain-muted bg-gain-light px-4 py-2 text-sm font-medium text-gain">
          {message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{filtered.length} assets</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={handleBackfillRanks}
          >
            Backfill Asset Ranks
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={handleGenerateMarketEvents}
          >
            Generate Market Events
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((asset) => (
          <Card key={asset.id} className="p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">{asset.name}</h3>
                  {asset.featured && (
                    <Badge className="border-gold-muted bg-gold-light text-gold">Featured</Badge>
                  )}
                  {asset.trading_paused && (
                    <Badge className="border-loss-muted bg-loss-light text-loss">Paused</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {CATEGORY_LABELS[asset.category]} · {formatDaq(asset.current_price)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={asset.featured ? "gold" : "secondary"}
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleToggleFeatured(asset.id, asset.featured)}
                >
                  {asset.featured ? "Featured" : "Feature"}
                </Button>
                <Button
                  variant={asset.trading_paused ? "danger" : "secondary"}
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleToggleTrading(asset.id, asset.trading_paused)}
                >
                  {asset.trading_paused ? "Paused" : "Pause"}
                </Button>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const input = form.elements.namedItem(
                      `price-${asset.id}`
                    ) as HTMLInputElement;
                    handlePriceOverride(asset.id, input.value);
                  }}
                >
                  <Input
                    name={`price-${asset.id}`}
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="New price"
                    className="w-28"
                  />
                  <Button type="submit" size="sm" variant="ghost" disabled={isPending}>
                    Set
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
