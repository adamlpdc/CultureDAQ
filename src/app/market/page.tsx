import { Suspense } from "react";
import { AssetList } from "@/components/assets/asset-list";
import { MarketFilters } from "@/components/market/market-filters";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading";
import { getAssets } from "@/lib/queries";
import type { AssetCategory, MarketSort } from "@/types/database";

interface MarketPageProps {
  searchParams: Promise<{
    category?: AssetCategory;
    sort?: MarketSort;
    q?: string;
  }>;
}

async function MarketContent({
  category,
  sort,
  search,
}: {
  category?: AssetCategory;
  sort?: MarketSort;
  search?: string;
}) {
  const assets = await getAssets({
    category,
    sort: sort ?? "trending",
    search,
  });

  return <AssetList assets={assets} />;
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Market"
        description="Browse, filter, and trade shares across the cultural exchange."
      />

      <Suspense fallback={<LoadingSpinner />}>
        <MarketFilters />
      </Suspense>

      <Suspense
        key={`${params.category}-${params.sort}-${params.q}`}
        fallback={<LoadingSpinner />}
      >
        <MarketContent
          category={params.category}
          sort={params.sort}
          search={params.q}
        />
      </Suspense>
    </div>
  );
}
