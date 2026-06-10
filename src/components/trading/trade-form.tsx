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

  if (!isLoggedIn) {
    return (
      <Card>
        <p className="text-center text-muted">
          <a href="/login" className="font-medium text-primary hover:text-primary-hover">
            Sign in
          </a>{" "}
          to trade {asset.name}.
        </p>
      </Card>
    );
  }

  if (asset.trading_paused) {
    return (
      <Card>
        <p className="text-center font-medium text-gold">Trading is paused for this asset.</p>
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
    <Card>
      <CardHeader>
        <CardTitle>Place Trade</CardTitle>
        <div className="flex gap-2 rounded-xl bg-surface-muted p-1">
          <button
            onClick={() => setMode("buy")}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
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
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              mode === "sell"
                ? "bg-loss-light text-loss shadow-card"
                : "text-muted hover:text-foreground"
            )}
          >
            Sell
          </button>
        </div>
      </CardHeader>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
            Shares
          </label>
          <Input
            type="number"
            min={1}
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="Enter number of shares"
          />
          <div className="mt-2 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setShares(String(mode === "buy" ? maxBuyShares : maxSellShares))
              }
            >
              Max
            </Button>
            <span className="self-center text-xs text-muted">
              {mode === "buy"
                ? `Max: ${maxBuyShares} shares`
                : `Owned: ${ownedShares} shares`}
            </span>
          </div>
        </div>

        {shareCount > 0 && (
          <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Total</span>
              <span className="font-semibold text-foreground">{formatDaq(totalCost)}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-muted">Balance after</span>
              <span className="font-medium text-foreground">
                {formatDaq(
                  mode === "buy" ? daqBalance - totalCost : daqBalance + totalCost
                )}
              </span>
            </div>
          </div>
        )}

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
          loading={isPending}
          disabled={
            shareCount <= 0 ||
            (mode === "buy" && (totalCost > daqBalance || maxBuyShares < shareCount)) ||
            (mode === "sell" && shareCount > ownedShares)
          }
          onClick={handleSubmit}
        >
          {mode === "buy" ? "Buy Shares" : "Sell Shares"}
        </Button>
      </div>
    </Card>
  );
}
