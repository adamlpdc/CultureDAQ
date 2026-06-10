import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortfolioEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-tint bg-surface p-8 text-center shadow-card md:p-10">
      <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-primary-light/30 blur-3xl" />
      <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-gold-subtle/40 blur-3xl" />
      <div className="relative">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
          <Rocket className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground md:text-2xl">
          Build Your First Portfolio
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          Browse the market and buy your first asset. Track performance, ride the momentum,
          and compete on the leaderboard.
        </p>
        <Link href="/market" className="mt-6 inline-block">
          <Button size="lg">Explore Market</Button>
        </Link>
      </div>
    </div>
  );
}
