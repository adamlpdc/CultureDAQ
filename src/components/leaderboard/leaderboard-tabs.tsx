"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { LeaderboardPeriod } from "@/lib/leaderboard-analytics";
import { cn } from "@/lib/utils";

const TABS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
];

export function LeaderboardTabs({ active }: { active: LeaderboardPeriod }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setPeriod(period: LeaderboardPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    if (period === "all") {
      params.delete("period");
    } else {
      params.set("period", period);
    }
    const qs = params.toString();
    router.push(qs ? `/leaderboard?${qs}` : "/leaderboard");
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setPeriod(tab.id)}
          className={cn(
            "min-w-[5rem] flex-1 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-all sm:flex-none",
            active === tab.id
              ? "bg-surface text-primary shadow-card ring-1 ring-border-tint"
              : "text-muted hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
