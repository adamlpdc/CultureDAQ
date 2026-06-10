import Link from "next/link";
import {
  Building2,
  Clapperboard,
  Dumbbell,
  Mic2,
  Radio,
  Shirt,
  Trophy,
  Tv,
  Users,
} from "lucide-react";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import type { AssetCategory } from "@/types/database";
import { Card } from "@/components/ui/card";

const categoryIcons: Record<AssetCategory, typeof Users> = {
  actors: Users,
  musicians: Mic2,
  athletes: Dumbbell,
  influencers: Radio,
  tv_personalities: Tv,
  brands: Building2,
  movies: Clapperboard,
  tv_shows: Shirt,
  sports_teams: Trophy,
};

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {ALL_CATEGORIES.map((cat) => {
        const Icon = categoryIcons[cat];
        return (
          <Link key={cat} href={`/market?category=${cat}`} className="h-full">
            <Card className="flex h-full min-h-[44px] items-center gap-2 p-2.5 transition-all hover:border-border-tint hover:shadow-card-hover">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-[11px] font-semibold leading-tight text-foreground">
                {CATEGORY_LABELS[cat]}
              </p>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
