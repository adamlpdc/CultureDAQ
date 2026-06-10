"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AchievementFilterTab } from "@/lib/achievements/constants";
import { ACHIEVEMENT_FILTER_TABS } from "@/lib/achievements/constants";
import type { AchievementCardData } from "@/lib/queries";
import { AchievementGridCard } from "@/components/achievements/achievement-grid-card";
import { cn } from "@/lib/utils";

interface AchievementsExplorerProps {
  cards: AchievementCardData[];
}

export function AchievementsExplorer({ cards }: AchievementsExplorerProps) {
  const [activeTab, setActiveTab] = useState<AchievementFilterTab>("All");

  const filtered = useMemo(() => {
    switch (activeTab) {
      case "Unlocked":
        return cards.filter((c) => c.isUnlocked);
      case "Locked":
        return cards.filter((c) => !c.isUnlocked);
      case "All":
        return cards;
      default:
        return cards.filter((c) => c.achievement.category === activeTab);
    }
  }, [activeTab, cards]);

  const isFilterEmpty = filtered.length === 0 && cards.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none md:gap-2">
        {ACHIEVEMENT_FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
              activeTab === tab
                ? "bg-primary-light text-primary shadow-card"
                : "bg-surface-muted text-muted hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-surface-muted/20 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            Achievements catalog unavailable
          </p>
          <p className="mt-1 text-xs text-muted">
            Run the achievements SQL migrations in Supabase to enable persistence.
          </p>
        </div>
      ) : isFilterEmpty ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-surface-muted/20 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">No achievements in this view</p>
          <p className="mt-1 text-xs text-muted">
            {activeTab === "Unlocked"
              ? "You have not unlocked any achievements in this filter yet."
              : activeTab === "Locked"
                ? "You have unlocked everything in this filter — nice work."
                : "Try another filter or"}{" "}
            {activeTab !== "Locked" && activeTab !== "Unlocked" && (
              <>
                <Link href="/market" className="font-semibold text-primary hover:underline">
                  start trading
                </Link>
                .
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((card) => (
            <AchievementGridCard key={card.achievement.code} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
