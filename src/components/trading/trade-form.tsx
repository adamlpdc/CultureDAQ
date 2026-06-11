"use client";

import { useState, useTransition } from "react";
import { buyShares, sellShares } from "@/actions/trading";
import { useAchievementToast } from "@/components/achievements/achievement-provider";
import type { Asset } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDaq, formatPercent } from "@/lib/utils";

interface TradeFormProps {
  asset: Asset;
  daqBalance: number;
  ownedShares: number;
  avgCost: number;
  isLoggedIn: boolean;
}

function PreviewRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={cn("text-stat font-semibold text-foreground", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

export function TradeForm({
  asset,
  daqBalance,
  ownedShares,
  avgCost,
  isLoggedIn,
}: TradeFormProps) {
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showUnlocks } = useAchievementToast();

  const shareCount = parseInt(shares) || 0;
  const totalCost = shareCount * asset.current_price;
  const maxBuyShares = Math.floor(daqBalance / asset.current_price);
  const maxSellShares = ownedShares;
  const balanceAfter =
    mode === "buy" ? daqBalance - totalCost : daqBalance + totalCost;

  const perShareProfit = asset.current_price - avgCost;
  const totalProfit = perShareProfit * shareCount;
  const profitPercent = avgCost > 0 ? (perShareProfit / avgCost) * 100 : 0;
  const isProfitable = perShareProfit >= 0;
  const showSellProfit = mode === "sell" && shareCount > 0 && avgCost > 0;

  if (!isLoggedIn) {
    return (
      <Card className="!p-4 md:!p-5">
        <p className="text-center text-sm text-muted">
          <a href="/login" className="font-semibold text-primary hover:text-primary-hover">
            Sign in
          </a>{" "}
          to trade {asset.name}.
        </p>
      </Card>
    );
  }

  if (asset.trading_paused) {
    return (
      <Card className="!p-4 md:!p-5">
        <p className="text-center text-sm font-medium text-gold">
          Trading is paused for this asset.
        </p>
      </Card>
    );
  }

  function handleSubmit() {
    setMessage(null);
    startTransition(async () => {
      const result =
        mode === "buy"
          ? await buyShares(asset.id, shareCount)
          : await sellShares(asset.id, shareCount);

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        setShares("");
        if (result.unlockedAchievements.length > 0) {
          showUnlocks(result.unlockedAchievements);
        }
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <Card className="!p-4 md:!p-5">
      <CardHeader className="mb-3 flex-col items-stretch gap-3">
        <CardTitle>Place Trade</CardTitle>
        <div className="flex gap-1.5 rounded-xl bg-surface-muted p-1">
          <button
            onClick={() => setMode("buy")}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
              mode === "buy"
                ? "bg-gain-light text-gain shadow-card"
                : "text-muted hover:text-foreground"
            )}
          >
            Buy
          </button>
          <button
            onClick={() => setMode("sell")}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
              mode === "sell"
                ? "bg-loss-light text-loss shadow-card"
                : "text-muted hover:text-foreground"
            )}
          >
            Sell
          </button>
        </div>
      </CardHeader>

      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/80 bg-surface-muted/30 p-3 text-xs">
          <div>
            <p className="text-muted">Available Cash</p>
            <p className="text-stat mt-0.5 font-bold text-foreground">
              {formatDaq(daqBalance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted">You Own</p>
            <p className="text-stat mt-0.5 font-bold text-foreground">
              {ownedShares.toLocaleString()} shares
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Shares
          </label>
          <Input
            type="number"
            min={1}
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="Enter number of shares"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setShares(String(mode === "buy" ? maxBuyShares : maxSellShares))
              }
            >
              Max
            </Button>
            <span className="text-xs text-muted">
              {mode === "buy"
                ? `Up to ${maxBuyShares.toLocaleString()} shares`
                : `${ownedShares.toLocaleString()} available to sell`}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "rounded-xl border p-3.5 transition-colors",
            shareCount > 0
              ? mode === "buy"
                ? "border-gain-muted/50 bg-gain-light/30"
                : showSellProfit
                  ? isProfitable
                    ? "border-gain-muted/50 bg-gain-light/30"
                    : "border-loss-muted/50 bg-loss-light/30"
                  : "border-loss-muted/50 bg-loss-light/30"
              : "border-border bg-surface-muted/30"
          )}
        >
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            {mode === "sell" ? "Sell Preview" : "Trade Preview"}
          </p>
          <div className="space-y-2 text-sm">
            {mode === "sell" ? (
              <>
                <PreviewRow
                  label="Average Cost"
                  value={avgCost > 0 ? formatDaq(avgCost) : "—"}
                />
                <PreviewRow label="Current Price" value={formatDaq(asset.current_price)} />
                <PreviewRow
                  label="Estimated Proceeds"
                  value={shareCount > 0 ? formatDaq(totalCost) : "—"}
                  valueClassName="font-bold"
                />
                {showSellProfit ? (
                  <div className="border-t border-border/60 pt-2">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-foreground-secondary">
                        Profit/Loss
                      </span>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-stat font-bold",
                            isProfitable ? "text-gain" : "text-loss"
                          )}
                        >
                          {totalProfit >= 0 ? "+" : "-"}
                          {formatDaq(Math.abs(totalProfit))}
                        </p>
                        <p
                          className={cn(
                            "text-xs font-semibold",
                            isProfitable ? "text-gain" : "text-loss"
                          )}
                        >
                          ({formatPercent(profitPercent)})
                        </p>
                      </div>
                    </div>
                  </div>
                ) : shareCount > 0 ? (
                  <PreviewRow label="Profit/Loss" value="—" />
                ) : null}
                <div className="flex justify-between gap-3 border-t border-border/60 pt-2">
                  <span className="font-medium text-foreground-secondary">
                    Balance After Trade
                  </span>
                  <span className="text-stat daq-price font-bold text-foreground">
                    {shareCount > 0 ? formatDaq(balanceAfter) : formatDaq(daqBalance)}
                  </span>
                </div>
                <PreviewRow
                  label="Shares"
                  value={shareCount > 0 ? shareCount.toLocaleString() : "—"}
                />
              </>
            ) : (
              <>
                <PreviewRow
                  label="Shares"
                  value={shareCount > 0 ? shareCount.toLocaleString() : "—"}
                />
                <PreviewRow
                  label="Estimated Cost"
                  value={shareCount > 0 ? formatDaq(totalCost) : "—"}
                  valueClassName="font-bold"
                />
                <div className="flex justify-between gap-3 border-t border-border/60 pt-2">
                  <span className="font-medium text-foreground-secondary">
                    Balance After Trade
                  </span>
                  <span className="text-stat daq-price font-bold text-foreground">
                    {shareCount > 0 ? formatDaq(balanceAfter) : formatDaq(daqBalance)}
                  </span>
                </div>
                <PreviewRow label="Price per share" value={formatDaq(asset.current_price)} />
              </>
            )}
          </div>
        </div>

        {message && (
          <p
            className={cn(
              "text-sm font-medium",
              message.type === "success" ? "text-gain" : "text-loss"
            )}
          >
            {message.text}
          </p>
        )}

        <Button
          variant={mode === "buy" ? "gain" : "loss"}
          className="w-full"
          size="lg"
          loading={isPending}
          disabled={
            shareCount <= 0 ||
            (mode === "buy" && (totalCost > daqBalance || maxBuyShares < shareCount)) ||
            (mode === "sell" && shareCount > ownedShares)
          }
          onClick={handleSubmit}
        >
          {mode === "buy" ? `Buy ${asset.name}` : `Sell ${asset.name}`}
        </Button>
      </div>
    </Card>
  );
}
