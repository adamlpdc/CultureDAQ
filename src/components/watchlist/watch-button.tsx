"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Eye, Star } from "lucide-react";
import { toggleWatchlist } from "@/actions/watchlist";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Shared watch control styling */
export const watchIconButtonClass = (watched: boolean) =>
  cn(
    "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors disabled:opacity-60",
    watched
      ? "border-primary/30 bg-primary-light/50 text-primary"
      : "border-border/80 bg-surface/90 text-muted hover:border-border-tint hover:text-foreground"
  );

export const watchDefaultButtonClass = (watched: boolean) =>
  cn(
    "text-xs",
    watched && "border-primary/25 bg-primary-light/40 text-primary hover:bg-primary-light/60"
  );

interface WatchButtonProps {
  assetId: string;
  initialWatched: boolean;
  isLoggedIn: boolean;
  variant?: "default" | "icon";
  className?: string;
  redirectPath?: string;
}

export function WatchButton({
  assetId,
  initialWatched,
  isLoggedIn,
  variant = "default",
  className,
  redirectPath,
}: WatchButtonProps) {
  const router = useRouter();
  const [watched, setWatched] = useState(initialWatched);
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) {
    const loginHref = `/login?redirect=${encodeURIComponent(redirectPath ?? "/market")}`;
    if (variant === "icon") {
      return (
        <Link
          href={loginHref}
          title="Sign in to watch"
          aria-label="Sign in to watch"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-surface/90 text-muted transition-colors hover:border-border-tint hover:text-foreground",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Star className="h-3.5 w-3.5" />
        </Link>
      );
    }
    return (
      <Link href={loginHref}>
        <Button variant="secondary" size="sm" className={cn("text-xs", className)}>
          <Eye className="h-3.5 w-3.5" />
          Sign in to watch
        </Button>
      </Link>
    );
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    startTransition(async () => {
      const result = await toggleWatchlist(assetId, watched);
      if (result.success) {
        setWatched(result.watched);
        router.refresh();
      }
    });
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title={watched ? "Watching — click to remove" : "Watch this asset"}
        aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
        className={cn(watchIconButtonClass(watched), className)}
      >
        <Star className={cn("h-3.5 w-3.5", watched && "fill-current")} />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={watched ? "secondary" : "ghost"}
      size="sm"
      loading={isPending}
      disabled={isPending}
      onClick={handleClick}
      className={cn(watchDefaultButtonClass(watched), className)}
    >
      {isPending ? (
        "Updating..."
      ) : watched ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Watching
        </>
      ) : (
        <>
          <Eye className="h-3.5 w-3.5" />
          Watch
        </>
      )}
    </Button>
  );
}
