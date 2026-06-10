"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { CATEGORY_EMOJI } from "@/lib/asset-visual";
import type { AssetCategory, MarketSort } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MARKET_VIEWS: { value: MarketSort; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "gainers", label: "Gainers" },
  { value: "losers", label: "Losers" },
  { value: "most_traded", label: "Most Traded" },
  { value: "new_listings", label: "New Listings" },
];

const SORT_OPTIONS: { value: MarketSort; label: string }[] = [
  { value: "price_desc", label: "Highest Price" },
  { value: "price_asc", label: "Lowest Price" },
  { value: "gainers", label: "Biggest Gain" },
  { value: "losers", label: "Biggest Loss" },
  { value: "most_traded", label: "Most Traded" },
  { value: "name", label: "Alphabetical" },
];

export function MarketFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") as AssetCategory | null;
  const sort = (searchParams.get("sort") as MarketSort) || "trending";
  const query = searchParams.get("q") || "";
  const [search, setSearch] = useState(query);

  const hasActiveFilters = Boolean(
    category || query.trim() || sort !== "trending"
  );

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

  const resetFilters = useCallback(() => {
    setSearch("");
    router.push("/market");
  }, [router]);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== query) {
        updateParams({ q: search || null });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, query, updateParams]);

  const activeLabels = useMemo(() => {
    const labels: string[] = [];
    if (query.trim()) labels.push(`Search: "${query.trim()}"`);
    if (category) labels.push(CATEGORY_LABELS[category]);
    const sortLabel =
      MARKET_VIEWS.find((v) => v.value === sort)?.label ??
      SORT_OPTIONS.find((s) => s.value === sort)?.label;
    if (sort !== "trending" && sortLabel) labels.push(sortLabel);
    return labels;
  }, [query, category, sort]);

  return (
    <Card className="!p-4 ring-1 ring-border/80 md:!p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          Search &amp; Filter
        </p>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={resetFilters}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <Input
          className="h-12 border-border-tint bg-surface-muted/30 pl-10 text-sm shadow-card ring-1 ring-border/70 transition-shadow placeholder:text-muted-light focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-primary-muted"
          placeholder="Find assets by name or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {activeLabels.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Active:
          </span>
          {activeLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-primary-muted bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
          Category
        </p>
        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={!category} onClick={() => updateParams({ category: null })}>
            All
          </FilterPill>
          {ALL_CATEGORIES.map((cat) => (
            <FilterPill
              key={cat}
              active={category === cat}
              onClick={() =>
                updateParams({ category: category === cat ? null : cat })
              }
            >
              {CATEGORY_EMOJI[cat]} {CATEGORY_LABELS[cat]}
            </FilterPill>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
          Market View
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MARKET_VIEWS.map((opt) => (
            <FilterPill
              key={opt.value}
              active={sort === opt.value}
              onClick={() => updateParams({ sort: opt.value })}
            >
              {opt.label}
            </FilterPill>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-border/60 pt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
          Sort
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParams({ sort: opt.value })}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                sort === opt.value
                  ? "bg-primary-light text-primary shadow-sm ring-2 ring-primary-muted"
                  : "text-muted hover:bg-surface-muted/60 hover:text-foreground"
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

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary-light text-primary shadow-sm ring-2 ring-primary-muted"
          : "border-border bg-surface text-muted hover:border-border-tint hover:bg-surface-muted/50 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
