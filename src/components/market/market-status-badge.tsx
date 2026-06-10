import { Badge } from "@/components/ui/badge";
import type { MarketStatus } from "@/lib/market-helpers";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  MarketStatus,
  { emoji: string; label: string; className: string }
> = {
  trending: {
    emoji: "🔥",
    label: "Trending",
    className: "border-gold-muted bg-gold-subtle text-gold",
  },
  high_momentum: {
    emoji: "🚀",
    label: "High Momentum",
    className: "border-primary-muted bg-primary-light text-primary",
  },
  new_listing: {
    emoji: "🆕",
    label: "New Listing",
    className: "border-primary-muted bg-primary-light text-primary",
  },
  most_traded: {
    emoji: "💰",
    label: "Most Traded",
    className: "border-border-tint bg-surface-muted text-foreground-secondary",
  },
  featured: {
    emoji: "⭐",
    label: "Featured",
    className: "border-gold-muted bg-gold-subtle text-gold",
  },
  rising_fast: {
    emoji: "📈",
    label: "Rising Fast",
    className: "border-gain-muted bg-gain-light text-gain",
  },
  falling_fast: {
    emoji: "📉",
    label: "Falling Fast",
    className: "border-loss-muted bg-loss-light text-loss",
  },
};

export function MarketStatusBadge({
  status,
  size = "xs",
  className,
}: {
  status: MarketStatus;
  size?: "xs" | "sm";
  className?: string;
}) {
  const config = STATUS_STYLES[status];
  return (
    <Badge
      className={cn(
        "shrink-0 gap-0.5 font-semibold",
        size === "xs" ? "px-1.5 py-0 text-[9px]" : "px-2 py-0.5 text-[10px]",
        config.className,
        className
      )}
    >
      <span aria-hidden>{config.emoji}</span>
      {config.label}
    </Badge>
  );
}

export function MarketStatusBadgeGroup({
  statuses,
  size = "xs",
  className,
  max = 2,
}: {
  statuses: MarketStatus[];
  size?: "xs" | "sm";
  className?: string;
  max?: number;
}) {
  const visible = statuses.slice(0, max);
  if (visible.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-0.5", className)}>
      {visible.map((s) => (
        <MarketStatusBadge key={s} status={s} size={size} />
      ))}
    </div>
  );
}
