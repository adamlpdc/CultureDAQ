import {
  BarChart3,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { CategoryGrid } from "@/components/home/category-grid";
import { CultureMoments } from "@/components/home/culture-moments";
import { DashboardPanel } from "@/components/home/dashboard-panel";
import { DashboardSectionHeader } from "@/components/home/dashboard-section-header";
import { FeatureCards } from "@/components/home/feature-cards";
import { HeroSection } from "@/components/home/hero-section";
import { MoverList } from "@/components/home/mover-list";
import { MostTradedTable } from "@/components/home/most-traded-table";
import { NewListings } from "@/components/home/new-listings";
import { TrendingGrid } from "@/components/home/trending-grid";
import { SectionHeader } from "@/components/ui/page-header";
import { SHOWCASE_SLUGS } from "@/lib/asset-visual";
import {
  getAssets,
  getAssetsBySlugs,
  getCurrentUser,
  getMarketStats,
  getNewListings,
} from "@/lib/queries";

export default async function HomePage() {
  const user = await getCurrentUser();

  const [trending, gainers, losers, mostTraded, newListings, showcase, stats] =
    await Promise.all([
      getAssets({ sort: "trending", limit: 6 }),
      getAssets({ sort: "gainers", limit: 5 }),
      getAssets({ sort: "losers", limit: 5 }),
      getAssets({ sort: "most_traded", limit: 10 }),
      getNewListings(4),
      getAssetsBySlugs([...SHOWCASE_SLUGS]),
      getMarketStats(),
    ]);

  return (
    <div className="space-y-5 md:space-y-6">
      <HeroSection
        showcaseAssets={showcase}
        stats={stats}
        isLoggedIn={!!user}
      />

      <FeatureCards />

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-12">
        <DashboardPanel className="md:col-span-2 lg:col-span-6">
          <DashboardSectionHeader
            title="Trending Now"
            icon={<Zap className="h-3.5 w-3.5 text-primary" />}
            href="/market?sort=trending"
          />
          <TrendingGrid assets={trending} />
        </DashboardPanel>

        <DashboardPanel className="flex flex-col md:col-span-1 lg:col-span-3">
          <DashboardSectionHeader
            title="Biggest Gainers"
            icon={<TrendingUp className="h-3.5 w-3.5 text-gain" />}
          />
          <MoverList assets={gainers} />
        </DashboardPanel>

        <DashboardPanel className="flex flex-col md:col-span-1 lg:col-span-3">
          <DashboardSectionHeader
            title="Biggest Losers"
            icon={<TrendingDown className="h-3.5 w-3.5 text-loss" />}
          />
          <MoverList assets={losers} />
        </DashboardPanel>

        <DashboardPanel className="md:col-span-2 lg:col-span-7">
          <DashboardSectionHeader
            title="Most Traded"
            icon={<BarChart3 className="h-3.5 w-3.5 text-primary" />}
            href="/market?sort=most_traded"
          />
          <MostTradedTable assets={mostTraded} />
        </DashboardPanel>

        <DashboardPanel className="md:col-span-2 lg:col-span-5">
          <DashboardSectionHeader
            title="New Listings"
            icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
          />
          <NewListings assets={newListings} />
        </DashboardPanel>
      </div>

      <CultureMoments />

      <section>
        <SectionHeader title="Browse by Category" href="/market" linkLabel="View market" />
        <CategoryGrid />
      </section>
    </div>
  );
}
