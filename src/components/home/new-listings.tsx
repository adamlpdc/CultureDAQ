import Link from "next/link";
import type { Asset } from "@/types/database";
import { AssetVisualFromAsset } from "@/components/assets/asset-visual";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import { formatDaq } from "@/lib/utils";
import { Badge, NewBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewListingsProps {
  assets: Asset[];
}

export function NewListings({ assets }: NewListingsProps) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No new listings"
        description="Fresh assets will appear here."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {assets.map((asset) => (
        <Link
          key={asset.id}
          href={`/asset/${asset.slug}`}
          className="grid grid-cols-[auto_minmax(0,1fr)_5.5rem] items-center gap-x-4 py-[18px] transition-colors hover:bg-surface-muted/40"
        >
          <AssetVisualFromAsset asset={asset} size="sm" className="shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-snug text-foreground">
              {asset.name}
            </p>
            <div className="mt-2.5 flex items-center gap-1.5">
              <Badge className={cn("shrink-0", CATEGORY_COLORS[asset.category])}>
                {CATEGORY_LABELS[asset.category]}
              </Badge>
              <NewBadge />
            </div>
          </div>
          <p className="text-stat daq-price text-right text-xs font-bold text-foreground">
            {formatDaq(asset.current_price)}
          </p>
        </Link>
      ))}
    </div>
  );
}
