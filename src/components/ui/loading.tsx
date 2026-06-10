import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

export function AssetCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 h-4 w-2/3 rounded bg-surface-elevated" />
      <div className="mb-2 h-6 w-1/2 rounded bg-surface-elevated" />
      <div className="h-4 w-1/3 rounded bg-surface-elevated" />
    </div>
  );
}
