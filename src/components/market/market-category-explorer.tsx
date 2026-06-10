import Link from "next/link";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { CATEGORY_EMOJI } from "@/lib/asset-visual";
import type { AssetCategory } from "@/types/database";
import { Card } from "@/components/ui/card";

interface MarketCategoryExplorerProps {
  counts: Record<AssetCategory, number>;
}

export function MarketCategoryExplorer({ counts }: MarketCategoryExplorerProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-foreground">Category Explorer</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {ALL_CATEGORIES.map((cat) => (
          <Link key={cat} href={`/market?category=${cat}`} className="h-full">
            <Card className="flex h-full flex-col gap-1 !p-3 transition-all hover:border-border-tint hover:shadow-card-hover">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-lg leading-none">
                  {CATEGORY_EMOJI[cat]}
                </div>
                <p className="text-[11px] font-bold leading-tight text-foreground">
                  {CATEGORY_LABELS[cat]}
                </p>
              </div>
              <p className="text-[10px] font-medium text-muted">
                {counts[cat]} asset{counts[cat] !== 1 ? "s" : ""}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
