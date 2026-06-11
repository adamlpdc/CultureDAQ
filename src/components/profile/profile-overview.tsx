import Link from "next/link";
import { Award } from "lucide-react";
import { AchievementRarityBadge } from "@/components/achievements/achievement-rarity-badge";
import { ProfileFavoriteAssetCard } from "@/components/profile/profile-favorite-asset-card";
import { ProfileIdentityCard } from "@/components/profile/profile-identity-card";
import { Card } from "@/components/ui/card";
import type { ProfilePageData } from "@/lib/profile";
import { formatDaq, formatRelativeTime } from "@/lib/utils";

interface ProfileOverviewProps {
  data: ProfilePageData;
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <Card className="!p-4 transition-colors hover:border-border-tint">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="text-stat mt-1 text-lg font-bold text-foreground md:text-xl">{value}</p>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}

function formatUnlockDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProfileOverview({ data }: ProfileOverviewProps) {
  const {
    portfolioValue,
    portfolioRank,
    achievementLevel,
    playerStats,
    achievementStats,
    favoriteAchievementCard,
    favoriteAsset,
    recentAchievements,
  } = data;

  return (
    <div className="space-y-5 md:space-y-6">
      <ProfileIdentityCard data={data} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Portfolio Value" value={formatDaq(portfolioValue)} href="/portfolio" />
        <StatCard
          label="Portfolio Rank"
          value={portfolioRank != null ? `#${portfolioRank}` : "—"}
          href="/leaderboard"
        />
        <StatCard
          label="Achievement Score"
          value={`${achievementStats.achievementScore.toLocaleString()} pts`}
        />
        <StatCard
          label="Achievement Level"
          value={`Level ${achievementLevel.level}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Trades Completed"
          value={playerStats.tradesCompleted.toLocaleString()}
        />
        <StatCard label="Days Active" value={String(playerStats.daysActive)} />
        <StatCard
          label="Watchlist Assets"
          value={String(playerStats.watchlistCount)}
          href="/watchlist"
        />
        <StatCard
          label="Assets Owned"
          value={String(playerStats.assetsOwned)}
          href="/portfolio"
        />
        <StatCard
          label="Achievements Unlocked"
          value={`${playerStats.achievementsUnlocked}`}
        />
      </div>

      {favoriteAsset && <ProfileFavoriteAssetCard favoriteAsset={favoriteAsset} />}

      {favoriteAchievementCard && (
        <Card className="!p-5">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-gold" />
            <h3 className="text-sm font-bold text-foreground">Favorite Achievement</h3>
          </div>
          <div className="mt-4 flex items-start gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-gold-subtle/40 text-3xl ring-2 ring-gold-muted/60">
              {favoriteAchievementCard.achievement.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-foreground">
                {favoriteAchievementCard.achievement.name}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {favoriteAchievementCard.achievement.rarity && (
                  <AchievementRarityBadge rarity={favoriteAchievementCard.achievement.rarity} />
                )}
                <span className="text-xs font-bold text-gold">
                  +{favoriteAchievementCard.achievement.points} pts
                </span>
                {favoriteAchievementCard.unlockedAt && (
                  <span className="text-xs text-muted-light">
                    Unlocked {formatUnlockDate(favoriteAchievementCard.unlockedAt)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted line-clamp-2">
                {favoriteAchievementCard.achievement.description}
              </p>
            </div>
          </div>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Recent Achievements</h3>
          <Link
            href="/profile?tab=achievements"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {recentAchievements.length === 0 ? (
          <Card className="!p-5 text-center">
            <p className="text-sm text-muted">No achievements unlocked yet.</p>
            <Link
              href="/market"
              className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
            >
              Start trading →
            </Link>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentAchievements.map((card) => (
              <Card key={card.achievement.id} className="!p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{card.achievement.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {card.achievement.name}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-gold">
                      +{card.achievement.points} pts
                    </p>
                    {card.unlockedAt && (
                      <p className="mt-1 text-[10px] text-muted-light">
                        {formatRelativeTime(card.unlockedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
