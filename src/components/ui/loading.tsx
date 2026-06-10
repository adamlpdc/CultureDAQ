import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function AssetCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 h-4 w-2/3 rounded-lg bg-surface-muted" />
      <div className="mb-2 h-6 w-1/2 rounded-lg bg-surface-muted" />
      <div className="h-4 w-1/3 rounded-lg bg-surface-muted" />
    </div>
  );
}
