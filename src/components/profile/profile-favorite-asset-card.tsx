import Link from "next/link";
import { Star } from "lucide-react";
import { AssetIdentityFromAsset } from "@/components/assets/asset-identity";
import { Card } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { FavoriteAsset } from "@/lib/profile-identity";
import { formatDaq } from "@/lib/utils";

export function ProfileFavoriteAssetCard({
  favoriteAsset,
}: {
  favoriteAsset: FavoriteAsset;
}) {
  const { asset, shares, currentValue, rank } = favoriteAsset;

  return (
    <Card className="!p-5">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Favorite Asset</h3>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <AssetIdentityFromAsset asset={asset} size="lg" className="shrink-0" />

        <div className="min-w-0 flex-1">
          <Link
            href={`/asset/${asset.slug}`}
            className="text-base font-bold text-foreground hover:text-primary"
          >
            {asset.name}
          </Link>
          <p className="mt-0.5 text-xs font-semibold text-muted">
            {CATEGORY_LABELS[asset.category]}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                Shares
              </p>
              <p className="text-stat mt-0.5 text-sm font-bold text-foreground">
                {shares.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                Rank
              </p>
              <p className="text-stat mt-0.5 text-sm font-bold text-foreground">
                {rank != null ? `#${rank}` : "—"}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                Current Value
              </p>
              <p className="text-stat mt-0.5 text-sm font-bold text-foreground">
                {formatDaq(currentValue)}
              </p>
            </div>
          </div>

          {favoriteAsset.isRecentPurchaseFallback && (
            <p className="mt-2 text-[10px] text-muted-light">
              Based on your most recent purchase.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
