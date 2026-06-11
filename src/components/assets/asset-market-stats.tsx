import { Activity, BarChart3, Flame, Hash, TrendingUp, Zap } from "lucide-react";
import type { Asset, AssetRankMovement } from "@/types/database";
import { RankMovement } from "@/components/assets/rank-movement";
import { getMomentumLabel, getVolatilityLabel } from "@/lib/price-event-labels";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";

interface AssetMarketStatsProps {
  asset: Asset;
  marketRank: number;
  totalAssets: number;
  rankMovement?: AssetRankMovement | null;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-surface-muted/30 px-3 py-3",
        className
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-stat text-sm font-bold text-foreground">{value}</p>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export function AssetMarketStats({
  asset,
  marketRank,
  totalAssets,
  rankMovement,
}: AssetMarketStatsProps) {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const buyPressure = Number(asset.buy_pressure);
  const sellPressure = Number(asset.sell_pressure);
  const totalPressure = buyPressure + sellPressure;
  const buyPct = totalPressure > 0 ? (buyPressure / totalPressure) * 100 : 50;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <h2 className="mb-3 text-sm font-bold text-foreground">Market Stats</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Last Move"
          value={formatPercent(change)}
          sub={formatDaq(asset.previous_price)}
        />
        <StatCard
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          label="24h Trades"
          value={asset.trade_volume_24h.toLocaleString()}
          sub="shares traded"
        />
        <StatCard
          icon={<Hash className="h-3.5 w-3.5" />}
          label="Market Rank"
          value={`#${marketRank}`}
          sub={`of ${totalAssets.toLocaleString()} assets`}
        />
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Rank Change"
          value={<RankMovement movement={rankMovement} size="sm" />}
          sub={
            rankMovement?.previousRank != null && !rankMovement.isNewlyRanked
              ? `Previously #${rankMovement.previousRank}`
              : undefined
          }
        />
        <StatCard
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Momentum"
          value={getMomentumLabel(Number(asset.momentum_score))}
          sub={`Score ${Number(asset.momentum_score).toFixed(2)}`}
        />
        <StatCard
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Volatility"
          value={getVolatilityLabel(Number(asset.volatility_score))}
          sub={`Score ${Number(asset.volatility_score).toFixed(2)}`}
        />
        <StatCard
          icon={<Flame className="h-3.5 w-3.5" />}
          label="Pressure"
          value={<span className="text-gain">{buyPct.toFixed(0)}% buy</span>}
          sub={
            <span className="mt-1 block">
              <span className="flex h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <span className="bg-gain" style={{ width: `${buyPct}%` }} />
                <span className="bg-loss" style={{ width: `${100 - buyPct}%` }} />
              </span>
            </span>
          }
          className="col-span-2 sm:col-span-1"
        />
      </div>
    </div>
  );
}
