import Link from "next/link";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { CATEGORY_EMOJI } from "@/lib/asset-visual";
import type { AssetCategory } from "@/types/database";
import { Card } from "@/components/ui/card";

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {ALL_CATEGORIES.map((cat) => (
        <Link key={cat} href={`/market?category=${cat}`} className="h-full">
          <Card className="flex h-full min-h-[44px] items-center gap-2 p-2.5 transition-all hover:border-border-tint hover:shadow-card-hover">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-base leading-none">
              {CATEGORY_EMOJI[cat as AssetCategory]}
            </div>
            <p className="text-[11px] font-semibold leading-tight text-foreground">
              {CATEGORY_LABELS[cat]}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
