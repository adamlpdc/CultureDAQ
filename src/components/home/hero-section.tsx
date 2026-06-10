import Link from "next/link";
import { ArrowRight, BarChart3, Clock, Layers } from "lucide-react";
import type { Asset } from "@/types/database";
import { Button } from "@/components/ui/button";
import { HeroShowcase } from "@/components/home/hero-showcase";
import { PRICE_UPDATE_INTERVAL_MINUTES, ALL_CATEGORIES } from "@/lib/constants";

interface HeroSectionProps {
  showcaseAssets: Asset[];
  stats: { totalAssets: number };
  isLoggedIn: boolean;
}

export function HeroSection({ showcaseAssets, stats, isLoggedIn }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border-tint bg-surface shadow-elevated">
      <div className="hero-pattern absolute inset-0 opacity-25" />
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-light/50 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-gold-subtle/40 blur-3xl" />

      <div className="relative z-10 grid items-center gap-6 p-5 sm:p-6 lg:grid-cols-2 lg:items-center lg:gap-8 lg:p-8">
        <div className="flex flex-col justify-center">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-primary-muted bg-primary-light px-3.5 py-1 text-sm font-semibold text-primary">
            <BarChart3 className="h-4 w-4" />
            The cultural exchange
          </div>
          <h1 className="text-display text-3xl font-bold leading-tight text-foreground md:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            Trade culture.
            <br />
            <span className="text-primary">Ride the momentum.</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted md:text-base">
            Build a portfolio of the people, brands, teams, films and shows shaping
            the conversation.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/market">
              <Button size="lg">
                Explore Market <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {!isLoggedIn && (
              <Link href="/signup">
                <Button variant="secondary" size="lg">
                  Start with 100,000 DAQ
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5 sm:gap-4">
            {[
              { icon: Layers, label: "Assets Listed", value: stats.totalAssets.toLocaleString() },
              { icon: BarChart3, label: "Categories", value: ALL_CATEGORIES.length.toString() },
              {
                icon: Clock,
                label: "Price Updates",
                value: `Every ${PRICE_UPDATE_INTERVAL_MINUTES} min`,
              },
            ].map((stat) => (
              <div key={stat.label}>
                <stat.icon className="mb-1 h-4 w-4 text-primary" />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {stat.label}
                </p>
                <p className="text-stat text-sm font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <HeroShowcase assets={showcaseAssets} />
      </div>
    </section>
  );
}
