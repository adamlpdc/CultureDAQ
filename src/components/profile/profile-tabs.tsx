"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type ProfileTab = "overview" | "achievements" | "settings";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "achievements", label: "Achievements" },
  { id: "settings", label: "Settings" },
];

export function ProfileTabs({ active }: { active: ProfileTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setTab(tab: ProfileTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.push(qs ? `/profile?${qs}` : "/profile");
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setTab(tab.id)}
          className={cn(
            "min-w-[5.5rem] flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all sm:flex-none sm:text-sm",
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
