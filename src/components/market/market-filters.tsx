"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { CATEGORY_EMOJI } from "@/lib/asset-visual";
import type { AssetCategory, MarketSort } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: MarketSort; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "gainers", label: "Biggest Gainers" },
  { value: "losers", label: "Biggest Losers" },
  { value: "most_traded", label: "Most Traded" },
  { value: "price_desc", label: "Highest Price" },
  { value: "name", label: "Name A-Z" },
];

export function MarketFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") as AssetCategory | null;
  const sort = (searchParams.get("sort") as MarketSort) || "trending";
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`/market?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (search !== currentQ) {
        updateParams({ q: search || null });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, searchParams, updateParams]);

  return (
    <Card className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" />
        <Input
          className="pl-10"
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Category</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParams({ category: null })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              !category
                ? "border-primary bg-primary-light text-primary"
                : "border-border bg-surface text-muted hover:border-border-light hover:text-foreground"
            )}
          >
            All
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                updateParams({ category: category === cat ? null : cat })
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                category === cat
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border bg-surface text-muted hover:border-border-light hover:text-foreground"
              )}
            >
              {CATEGORY_EMOJI[cat]} {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Sort by</p>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParams({ sort: opt.value })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                sort === opt.value
                  ? "bg-primary text-white shadow-card"
                  : "bg-surface-muted text-muted hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
