"use client";

import { useState, useTransition } from "react";
import { buyShares, sellShares } from "@/actions/trading";
import type { Asset } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDaq } from "@/lib/utils";

interface TradeFormProps {
  asset: Asset;
  daqBalance: number;
  ownedShares: number;
  isLoggedIn: boolean;
}

export function TradeForm({
  asset,
  daqBalance,
  ownedShares,
  isLoggedIn,
}: TradeFormProps) {
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const shareCount = parseInt(shares) || 0;
  const totalCost = shareCount * asset.current_price;
  const maxBuyShares = Math.floor(daqBalance / asset.current_price);
  const maxSellShares = ownedShares;
  const balanceAfter =
    mode === "buy" ? daqBalance - totalCost : daqBalance + totalCost;

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
            <p className="text-muted">Your Balance</p>
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
                : "border-loss-muted/50 bg-loss-light/30"
              : "border-border bg-surface-muted/30"
          )}
        >
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            Trade Preview
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted">Shares</span>
              <span className="text-stat font-semibold text-foreground">
                {shareCount > 0 ? shareCount.toLocaleString() : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">
                {mode === "buy" ? "Estimated Cost" : "Estimated Proceeds"}
              </span>
              <span className="text-stat daq-price font-bold text-foreground">
                {shareCount > 0 ? formatDaq(totalCost) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-t border-border/60 pt-2">
              <span className="font-medium text-foreground-secondary">
                Balance After Trade
              </span>
              <span className="text-stat daq-price font-bold text-foreground">
                {shareCount > 0 ? formatDaq(balanceAfter) : formatDaq(daqBalance)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-muted">Price per share</span>
              <span className="text-stat daq-price text-foreground">
                {formatDaq(asset.current_price)}
              </span>
            </div>
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
