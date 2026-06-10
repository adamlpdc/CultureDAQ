import Link from "next/link";
import { Users } from "lucide-react";
import type { RelatedAssetEntry } from "@/lib/queries";
import { RelatedAssetCard } from "@/components/assets/related-asset-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface RelatedAssetsProps {
  entries: RelatedAssetEntry[];
}

export function RelatedAssets({ entries }: RelatedAssetsProps) {
  if (entries.length === 0) {
    return (
      <Card className="!p-4 md:!p-5">
        <EmptyState
          icon={Users}
          title="No related assets"
          description="Similar assets will appear here as the market grows."
        />
      </Card>
    );
  }

  return (
    <Card className="!p-4 md:!p-5">
      <CardHeader className="mb-2">
        <CardTitle>Related Assets</CardTitle>
        <Link
          href="/market"
          className="text-xs font-semibold text-primary hover:text-primary-hover"
        >
          View market
        </Link>
      </CardHeader>
      <p className="mb-3.5 text-xs leading-relaxed text-muted">
        Assets connected by category, cultural moment, or shared market momentum.
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {entries.map(({ asset, reason }) => (
          <RelatedAssetCard key={asset.id} asset={asset} reason={reason} />
        ))}
      </div>
    </Card>
  );
}
