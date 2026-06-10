import type { Asset } from "@/types/database";
import { AssetCard } from "@/components/assets/asset-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";

interface AssetListProps {
  assets: Asset[];
  emptyMessage?: string;
}

export function AssetList({
  assets,
  emptyMessage = "No assets found matching your criteria.",
}: AssetListProps) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No assets found"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
