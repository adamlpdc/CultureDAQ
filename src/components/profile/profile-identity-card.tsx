import Link from "next/link";
import { Award, Eye, Trophy, Wallet } from "lucide-react";
import { getAchievementLevelTitle } from "@/lib/achievement-level";
import { TraderAvatar } from "@/components/leaderboard/trader-avatar";
import { Card } from "@/components/ui/card";
import type { ProfilePageData } from "@/lib/profile";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile?tab=achievements", label: "Achievements", icon: Award },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
] as const;

export function ProfileIdentityCard({ data }: { data: ProfilePageData }) {
  const { profile, portfolioRank, achievementLevel, playerStats } = data;

  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="relative overflow-hidden !p-5 md:!p-6">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-light/40 blur-3xl" />
      <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-gold-subtle/30 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
        <TraderAvatar
          username={profile.username}
          avatarStyle={profile.avatar_style}
          size="profile"
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            @{profile.username}
          </h2>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-bold text-primary">
              {getAchievementLevelTitle(achievementLevel.level)}
            </span>
            {portfolioRank != null && (
              <>
                <span className="text-muted-light">·</span>
                <span className="font-semibold text-foreground-secondary">
                  Rank #{portfolioRank}
                </span>
              </>
            )}
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted-light">
            Member since {memberSince}
            <span className="text-muted-light/60"> · </span>
            {playerStats.tradesCompleted.toLocaleString()} trades completed
            <span className="text-muted-light/60"> · </span>
            {playerStats.daysActive} {playerStats.daysActive === 1 ? "day" : "days"} active
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-muted px-3 py-2",
              "text-xs font-semibold text-foreground-secondary transition-colors hover:border-border-tint hover:bg-surface"
            )}
          >
            <link.icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
            {link.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
