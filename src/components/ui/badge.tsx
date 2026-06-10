import type { AssetCategory } from "@/types/database";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import { CATEGORY_EMOJI } from "@/lib/asset-visual";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

const categoryBadgeSizes = {
  xs: "gap-0.5 px-1.5 py-0 text-[9px] [&_.cat-emoji]:text-[10px]",
  sm: "gap-1 px-1.5 py-0.5 text-[10px] [&_.cat-emoji]:text-[11px]",
  default: "gap-1 px-2 py-0.5 text-[11px] [&_.cat-emoji]:text-xs",
};

export function CategoryBadge({
  category,
  size = "default",
  className,
}: {
  category: AssetCategory;
  size?: "xs" | "sm" | "default";
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        categoryBadgeSizes[size],
        CATEGORY_COLORS[category],
        className
      )}
    >
      <span className="cat-emoji shrink-0 leading-none" aria-hidden>
        {CATEGORY_EMOJI[category]}
      </span>
      <span className="truncate">{CATEGORY_LABELS[category]}</span>
    </Badge>
  );
}

export function FeaturedBadge() {
  return (
    <Badge className="border-gold-muted bg-gold-subtle text-gold">
      Featured
    </Badge>
  );
}

export function NewBadge() {
  return (
    <Badge className="shrink-0 border-primary-muted bg-primary-light px-1.5 py-0 text-[9px] text-primary">
      New
    </Badge>
  );
}
