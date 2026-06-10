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
