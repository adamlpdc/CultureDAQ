import Link from "next/link";
import { ArrowRight, Sparkles, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { AssetList } from "@/components/assets/asset-list";
import { PortfolioSummaryCard } from "@/components/portfolio/portfolio-summary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import {
  getAssets,
  getCurrentUser,
  getMarketStats,
  getPortfolioSummary,
} from "@/lib/queries";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [trending, gainers, losers, mostTraded, featured, stats, portfolio] =
    await Promise.all([
      getAssets({ sort: "trending", limit: 6 }),
      getAssets({ sort: "gainers", limit: 6 }),
      getAssets({ sort: "losers", limit: 6 }),
      getAssets({ sort: "most_traded", limit: 6 }),
      getAssets({ featured: true, limit: 6 }),
      getMarketStats(),
      user ? getPortfolioSummary(user.id) : null,
    ]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/20 via-surface to-surface p-6 md:p-10">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-sm text-accent">
            <Sparkles className="h-4 w-4" />
            Fantasy market game — for fun only
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Trade culture.
            <br />
            <span className="text-accent">Build your portfolio.</span>
          </h1>
          <p className="mt-4 text-muted md:text-lg">
            Buy and sell shares in actors, musicians, brands, movies, and sports
            teams using fictional DAQ currency. No real money involved.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/market">
              <Button size="lg">
                Explore Market <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {!user && (
              <Link href="/signup">
                <Button variant="secondary" size="lg">
                  Get 100,000 DAQ Free
                </Button>
              </Link>
            )}
          </div>
          <p className="mt-4 text-xs text-muted">
            {stats.totalAssets} assets · Prices update every 15 minutes
          </p>
        </div>
      </section>

      {portfolio && (
        <section>
          <PortfolioSummaryCard summary={portfolio} />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-bold">Trending</h2>
          </div>
          <Link href="/market?sort=trending" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        <AssetList assets={trending} />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gain" />
            <h2 className="text-xl font-bold">Biggest Gainers</h2>
          </div>
          <AssetList assets={gainers} />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-loss" />
            <h2 className="text-xl font-bold">Biggest Losers</h2>
          </div>
          <AssetList assets={losers} />
        </section>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Most Traded</h2>
          <Link href="/market?sort=most_traded" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        <AssetList assets={mostTraded} />
      </section>

      {featured.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Featured Assets</h2>
          <AssetList assets={featured} />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">Browse by Category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ALL_CATEGORIES.map((cat) => (
            <Link key={cat} href={`/market?category=${cat}`}>
              <Card className="text-center transition-colors hover:border-accent/30">
                <p className="text-sm font-medium">{CATEGORY_LABELS[cat]}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
