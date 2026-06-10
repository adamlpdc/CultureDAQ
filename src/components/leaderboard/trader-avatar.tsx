import { cn } from "@/lib/utils";

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

export function TraderAvatar({
  username,
  size = "md",
  className,
}: {
  username: string;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
}) {
  const initials = getTraderInitials(username);
  const hue = getTraderHue(username);
  const sizes = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-12 w-12 text-sm",
    hero: "h-16 w-16 text-base",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-border/80 font-bold shadow-card",
        sizes[size],
        className
      )}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 30% 96%) 0%, hsl(${hue} 25% 88%) 100%)`,
        color: `hsl(${hue} 45% 28%)`,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
