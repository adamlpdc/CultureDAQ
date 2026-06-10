import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/database";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import { cn, formatDaq, formatPercent, getPriceChange } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const isPositive = change >= 0;

  return (
    <Link
      href={`/asset/${asset.slug}`}
      className="group block rounded-2xl border border-border bg-surface p-4 transition-all hover:border-accent/30 hover:bg-surface-elevated"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold group-hover:text-accent transition-colors">
            {asset.name}
          </h3>
          <Badge className={cn("mt-1", CATEGORY_COLORS[asset.category])}>
            {CATEGORY_LABELS[asset.category]}
          </Badge>
        </div>
        {asset.featured && (
          <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium text-gold">
            Featured
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xl font-bold">{formatDaq(asset.current_price)}</p>
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-sm font-medium",
              isPositive ? "text-gain" : "text-loss"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {formatPercent(change)}
          </div>
        </div>
        {asset.trade_volume_24h > 0 && (
          <p className="text-xs text-muted">
            {asset.trade_volume_24h.toLocaleString()} vol
          </p>
        )}
      </div>
    </Link>
  );
}
