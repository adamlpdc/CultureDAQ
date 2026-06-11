"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateAvatarStyle,
  updateFavoriteAchievement,
  updatePassword,
  updateUsername,
  type ProfileActionResult,
} from "@/actions/profile";
import { TraderAvatar } from "@/components/leaderboard/trader-avatar";
import { AVATAR_PRESETS } from "@/lib/avatars";
import type { ProfilePageData } from "@/lib/profile";
import type { AchievementCardData } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ProfileSettingsProps {
  data: ProfilePageData;
}

function SettingsMessage({ result }: { result?: ProfileActionResult }) {
  if (!result) return null;
  return (
    <p className={cn("text-sm", result.success ? "text-gain" : "text-loss")}>
      {result.success ? result.message ?? "Saved" : result.error}
    </p>
  );
}

function UsernameForm({ currentUsername }: { currentUsername: string }) {
  const [state, formAction] = useActionState(updateUsername, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="username" className="mb-1.5 block text-xs font-semibold text-muted">
          Username
        </label>
        <Input
          id="username"
          name="username"
          defaultValue={currentUsername}
          autoComplete="username"
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          required
        />
      </div>
      <SettingsMessage result={state} />
      <Button type="submit" size="sm" variant="secondary">
        Save username
      </Button>
    </form>
  );
}

function PasswordForm() {
  const [state, formAction] = useActionState(updatePassword, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-muted">
          New password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1.5 block text-xs font-semibold text-muted"
        >
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <SettingsMessage result={state} />
      <Button type="submit" size="sm" variant="secondary">
        Update password
      </Button>
    </form>
  );
}

function AvatarPicker({
  username,
  currentStyle,
}: {
  username: string;
  currentStyle: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentStyle);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<ProfileActionResult | null>(null);

  function handleSelect(styleId: string) {
    setSelected(styleId);
    startTransition(async () => {
      const result = await updateAvatarStyle(styleId);
      setMessage(result);
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <TraderAvatar username={username} avatarStyle={selected} size="lg" />
        <div>
          <p className="text-sm font-semibold text-foreground">Your avatar</p>
          <p className="text-xs text-muted">Shown on your profile and leaderboard</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {AVATAR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={isPending}
            onClick={() => handleSelect(preset.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-colors",
              selected === preset.id
                ? "border-primary bg-primary-light/30 ring-1 ring-primary/30"
                : "border-border bg-surface-muted hover:border-border-tint"
            )}
          >
            <TraderAvatar
              username={username}
              avatarStyle={preset.id}
              size="sm"
              className="!h-10 !w-10"
            />
            <span className="text-center text-[10px] font-semibold leading-tight text-muted">
              {preset.label}
            </span>
          </button>
        ))}
      </div>
      <SettingsMessage result={message ?? undefined} />
    </div>
  );
}

function FavoriteAchievementPicker({
  unlockedCards,
  currentFavoriteId,
}: {
  unlockedCards: AchievementCardData[];
  currentFavoriteId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<ProfileActionResult | null>(null);

  if (unlockedCards.length === 0) {
    return null;
  }

  function handleSelect(achievementId: string) {
    startTransition(async () => {
      const result = await updateFavoriteAchievement(achievementId);
      setMessage(result);
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <p className="text-xs font-semibold text-muted">Favorite achievement</p>
        <p className="mt-0.5 text-[10px] text-muted-light">
          Displayed on your profile overview
        </p>
      </div>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
        {unlockedCards.map((card) => (
          <button
            key={card.achievement.id}
            type="button"
            disabled={isPending}
            onClick={() => handleSelect(card.achievement.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
              currentFavoriteId === card.achievement.id
                ? "bg-gold-subtle/40 font-semibold text-foreground"
                : "hover:bg-surface-muted"
            )}
          >
            <span>{card.achievement.icon}</span>
            <span className="truncate">{card.achievement.name}</span>
          </button>
        ))}
      </div>
      <SettingsMessage result={message ?? undefined} />
    </div>
  );
}

export function ProfileSettings({ data }: ProfileSettingsProps) {
  const unlockedCards = data.achievements.cards.filter((c) => c.isUnlocked);

  return (
    <div className="space-y-4 md:space-y-5">
      <Card className="!p-5">
        <h3 className="text-sm font-bold text-foreground">Avatar</h3>
        <div className="mt-4">
          <AvatarPicker
            username={data.profile.username}
            currentStyle={data.profile.avatar_style ?? "classic"}
          />
        </div>
      </Card>

      <Card className="!p-5">
        <h3 className="text-sm font-bold text-foreground">Account</h3>
        <div className="mt-4 space-y-6">
          <UsernameForm currentUsername={data.profile.username} />

          <div className="border-t border-border pt-4">
            <label className="mb-1.5 block text-xs font-semibold text-muted">Email</label>
            <p className="rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm text-foreground-secondary">
              {data.email}
            </p>
            <p className="mt-1 text-[10px] text-muted-light">
              Contact support to change your email address.
            </p>
          </div>

          <FavoriteAchievementPicker
            unlockedCards={unlockedCards}
            currentFavoriteId={data.profile.favorite_achievement_id}
          />
        </div>
      </Card>

      <Card className="!p-5">
        <h3 className="text-sm font-bold text-foreground">Password</h3>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </Card>
    </div>
  );
}
