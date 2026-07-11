import { cn, displayUsername } from "@/lib/utils";
import { getAvatarPreset, resolveAvatarEmoji, resolveAvatarHue } from "@/lib/avatars";

export function getTraderInitials(username: string): string {
  const cleaned = username.replace(/^@/, "").trim();
  if (cleaned.length <= 2) return cleaned.toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

export function getTraderHue(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

const sizeClasses = {
  sm: { outer: "h-8 w-8", emoji: "text-base" },
  md: { outer: "h-10 w-10", emoji: "text-lg" },
  lg: { outer: "h-12 w-12", emoji: "text-xl" },
  hero: { outer: "h-16 w-16", emoji: "text-2xl" },
  profile: { outer: "h-20 w-20 md:h-24 md:w-24", emoji: "text-3xl md:text-4xl" },
};

export function TraderAvatar({
  username,
  avatarStyle,
  size = "md",
  className,
}: {
  username: string;
  avatarStyle?: string | null;
  size?: "sm" | "md" | "lg" | "hero" | "profile";
  className?: string;
}) {
  const preset = getAvatarPreset(avatarStyle);
  const emoji = resolveAvatarEmoji(avatarStyle);
  const hue = resolveAvatarHue(avatarStyle);
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border-2 shadow-card",
        sizes.outer,
        className
      )}
      style={{
        borderColor: `hsl(${hue} 35% 78%)`,
        background: `linear-gradient(145deg, hsl(${hue} 42% 97%) 0%, hsl(${hue} 38% 90%) 55%, hsl(${hue} 32% 84%) 100%)`,
        boxShadow: `0 2px 8px hsl(${hue} 30% 40% / 0.12), inset 0 1px 0 hsl(${hue} 50% 100% / 0.5)`,
      }}
      title={preset.label}
      role="img"
      aria-label={`${preset.label} avatar for ${displayUsername(username)}`}
    >
      <span className={cn("leading-none select-none", sizes.emoji)}>{emoji}</span>
    </div>
  );
}
