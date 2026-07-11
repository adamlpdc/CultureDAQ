import { Card, CardTitle } from "@/components/ui/card";
import type { RebalancePlan } from "@/lib/market-rebalance";
import { cn, formatDaq } from "@/lib/utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 2 });

export function MarketRebalancePreview({ plan }: { plan: RebalancePlan }) {
  const counts = plan.assets.reduce(
    (result, asset) => ({ ...result, [asset.tier]: result[asset.tier] + 1 }),
    { smaller: 0, mid: 0, major: 0, premier: 0 }
  );

  return (
    <div className="space-y-5">
      <Card className="border-gold-muted bg-gold-subtle !p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div>
            <p className="font-semibold text-foreground">Preview only—nothing can be applied from this page</p>
            <p className="mt-1 text-sm text-foreground-secondary">
              Application requires the reviewed SQL migration, the explicit feature flag, and the one-time confirmation phrase in the command-line script.
            </p>
          </div>
        </div>
      </Card>

      <Card className="border-loss-muted bg-loss-light !p-4">
        <p className="font-semibold text-loss">One-time player reset follows the preservation audit</p>
        <p className="mt-1 text-sm text-foreground-secondary">
          The transaction first proves that the stock-split rebalance preserves current portfolios and rankings. It then audits every player, resets cash to 100,000 DAQ, removes holdings and old trades, resets market-dependent achievements, and establishes clean portfolio and leaderboard baselines.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Assets", plan.assets.length],
          ["Old range", `${compact.format(plan.oldMinPrice)}–${compact.format(plan.oldMaxPrice)}`],
          ["New range", `${compact.format(plan.newMinPrice)}–${compact.format(plan.newMaxPrice)}`],
          ["Ranks preserved", plan.rankingsPreserved ? "Yes" : "No"],
          ["Maximum value drift", formatDaq(plan.maximumValueDrift)],
        ].map(([label, value]) => (
          <Card key={String(label)} className="!p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="!p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className={cn("mt-0.5 h-5 w-5", plan.rankingsPreserved ? "text-gain" : "text-loss")} />
          <div>
            <CardTitle className="text-sm">Preservation strategy</CardTitle>
            <p className="mt-2 text-sm text-muted">
              Every price is mapped monotonically by rank. Holdings receive the inverse share adjustment and average cost receives the price factor, preserving current value, cost basis, allocation percentages, total portfolios, and player rankings.
            </p>
            <p className="mt-2 text-xs text-muted">
              Tiers: {counts.premier} Premier · {counts.major} Major · {counts.mid} mid-tier · {counts.smaller} smaller
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden !p-0">
        <div className="border-b border-border p-4">
          <CardTitle className="text-sm">Asset-by-asset preview</CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1150px] w-full text-left text-xs">
            <thead className="bg-surface-muted text-[10px] uppercase tracking-wide text-muted">
              <tr>{["Rank", "Asset", "Tier", "Old price", "New price", "Compression", "Old shares", "New shares", "Rank after", "Value drift"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plan.assets.map((asset) => (
                <tr key={asset.id}>
                  <td className="px-4 py-4 font-semibold">#{asset.oldRank}</td>
                  <td className="px-4 py-4 font-semibold text-foreground">{asset.name}</td>
                  <td className="px-4 py-4 capitalize text-muted">{asset.tier}</td>
                  <td className="px-4 py-4 tabular-nums">{formatDaq(asset.currentPrice)}</td>
                  <td className="px-4 py-4 font-semibold tabular-nums text-primary">{formatDaq(asset.newPrice)}</td>
                  <td className="px-4 py-4 tabular-nums">{asset.priceFactor.toExponential(2)}×</td>
                  <td className="px-4 py-4 tabular-nums">{compact.format(asset.totalSharesOutstanding)}</td>
                  <td className="px-4 py-4 tabular-nums">{compact.format(asset.newTotalSharesOutstanding)}</td>
                  <td className={cn("px-4 py-4 font-semibold", asset.newRank === asset.oldRank ? "text-gain" : "text-loss")}>#{asset.newRank}</td>
                  <td className="px-4 py-4 tabular-nums">{formatDaq(asset.valueDrift)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
