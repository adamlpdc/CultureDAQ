"use client";

import { useState } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import type { AchievementCardData } from "@/lib/queries";
import { AchievementRarityBadge } from "@/components/achievements/achievement-rarity-badge";
import { getCategoryVisual, getRarityVisual } from "@/lib/achievements/visuals";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AchievementGridCardProps {
  card: AchievementCardData;
}

function formatUnlockDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AchievementGridCard({ card }: AchievementGridCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { achievement, progress, isUnlocked, unlockedAt, description, howToUnlock, progressDetail } =
    card;

  const categoryVisual = getCategoryVisual(achievement.category);
  const rarityVisual = getRarityVisual(achievement.rarity);
  const showProgress = !isUnlocked && progress > 0 && progress < 100;

  return (
    <Card
      className={cn(
        "relative overflow-hidden !p-0 transition-shadow",
        isUnlocked
          ? cn(
              "border-gold-muted/80 bg-gold-subtle/15 shadow-card hover:shadow-elevated",
              rarityVisual.glow
            )
          : cn("border-border/80 bg-surface hover:shadow-card", rarityVisual.border)
      )}
    >
      {isUnlocked && (
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gold-subtle/50 blur-2xl" />
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="relative w-full p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl text-2xl ring-2",
              categoryVisual.iconRing,
              !isUnlocked && "opacity-80 saturate-[0.85]"
            )}
          >
            {achievement.icon}
          </div>
          <div className="flex flex-col items-end gap-1">
            <AchievementRarityBadge rarity={achievement.rarity} />
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[9px] font-bold",
                isUnlocked
                  ? "border-gold-muted bg-gold-subtle text-gold"
                  : "border-border bg-surface-muted text-muted"
              )}
            >
              {achievement.points} pts
            </span>
          </div>
        </div>

        <p
          className={cn(
            "mt-2 text-[10px] font-bold uppercase tracking-wide",
            categoryVisual.accent
          )}
        >
          {achievement.category}
        </p>

        <div className="mt-1 flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">{achievement.name}</h3>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>

        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{description}</p>

        {!expanded && !isUnlocked && progressDetail.summary && (
          <p className="mt-2 text-[11px] font-semibold text-foreground-secondary">
            {progressDetail.summary}
          </p>
        )}

        {showProgress && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px] font-semibold text-muted">
              <span>{progressDetail.metricLabel}</span>
              <span>{progressDetail.summary}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className={cn("h-full rounded-full transition-all", categoryVisual.bar)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div
          className={cn(
            "mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide",
            isUnlocked ? "text-gain" : "text-muted"
          )}
        >
          {isUnlocked ? (
            <>
              <Check className="h-3 w-3" aria-hidden />
              Unlocked
              {unlockedAt && (
                <span className="font-medium normal-case text-muted">
                  · {formatUnlockDate(unlockedAt)}
                </span>
              )}
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" aria-hidden />
              Not unlocked yet
            </>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/60 bg-surface-muted/20 px-4 py-3 text-xs">
          <dl className="space-y-2">
            <div>
              <dt className="font-semibold text-foreground">Description</dt>
              <dd className="mt-0.5 text-muted">{description}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Requirement</dt>
              <dd className="mt-0.5 text-muted">{howToUnlock}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Progress</dt>
              <dd className="mt-0.5 font-semibold text-foreground-secondary">
                {progressDetail.summary}
              </dd>
              {!isUnlocked && (
                <dd className="mt-0.5 text-muted">
                  {progressDetail.currentDisplay} → {progressDetail.targetDisplay}
                </dd>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <dt className="font-semibold text-foreground">Rarity</dt>
                <dd className="mt-1">
                  <AchievementRarityBadge rarity={achievement.rarity} />
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Reward</dt>
                <dd className="mt-0.5 font-bold text-gold">{achievement.points} pts</dd>
              </div>
              {isUnlocked && unlockedAt && (
                <div>
                  <dt className="font-semibold text-foreground">Unlocked</dt>
                  <dd className="mt-0.5 text-muted">{formatUnlockDate(unlockedAt)}</dd>
                </div>
              )}
            </div>
          </dl>
        </div>
      )}
    </Card>
  );
}
