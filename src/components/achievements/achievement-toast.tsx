"use client";

import { X } from "lucide-react";
import type { UnlockedAchievement } from "@/types/database";
import { AchievementRarityBadge } from "@/components/achievements/achievement-rarity-badge";
import { cn } from "@/lib/utils";

interface AchievementToastProps {
  achievement: UnlockedAchievement;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-gold-muted bg-surface shadow-elevated",
        "translate-x-0 opacity-100 transition-all duration-300"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="bg-gold-subtle/50 px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gold">
            🏆 Achievement Unlocked
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>
            {achievement.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{achievement.name}</p>
            <p className="text-xs font-bold text-gold">+{achievement.points} pts</p>
            <div className="mt-2">
              <AchievementRarityBadge rarity={achievement.rarity} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AchievementToastStackProps {
  toasts: Array<{ id: string; achievement: UnlockedAchievement }>;
  onDismiss: (id: string) => void;
}

export function AchievementToastStack({ toasts, onDismiss }: AchievementToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((toast) => (
        <AchievementToast
          key={toast.id}
          achievement={toast.achievement}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
