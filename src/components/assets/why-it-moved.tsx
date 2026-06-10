import { MessageCircle, TrendingDown, TrendingUp } from "lucide-react";
import type { Asset, PriceEvent } from "@/types/database";
import type { CultureMoment } from "@/lib/culture-context";
import {
  generateMovementSummary,
  getMovementHeadline,
} from "@/lib/movement-summary";
import { PRICE_EVENT_SOURCE_LABELS } from "@/lib/price-event-labels";
import { cn, formatPercent } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface WhyItMovedProps {
  asset: Asset;
  events: PriceEvent[];
  cultureMoment?: CultureMoment | null;
}

function formatEventTime(date: string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WhyItMoved({ asset, events, cultureMoment }: WhyItMovedProps) {
  const summaryBullets = generateMovementSummary(asset, cultureMoment);
  const headline = getMovementHeadline(asset);
  const change = events[0]?.change_percent ?? 0;
  const isRising = change >= 0;

  if (events.length === 0) {
    return (
      <Card className="!p-4 md:!p-5">
        <CardHeader className="mb-3">
          <CardTitle>Why It Moved</CardTitle>
        </CardHeader>
        <div className="mb-4 rounded-xl border border-border-tint bg-surface-muted/40 p-4">
          <h3 className="text-sm font-bold text-foreground">{headline}</h3>
          <ul className="mt-3 space-y-2">
            {summaryBullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2 text-sm text-foreground-secondary"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
        <EmptyState
          icon={MessageCircle}
          title="No detailed updates yet"
          description="Event-by-event explanations will appear as the market updates."
        />
      </Card>
    );
  }

  const [latest, ...previous] = events;
  const isLatestPositive = latest.change_percent >= 0;

  return (
    <Card className="!p-4 md:!p-5">
      <CardHeader className="mb-3">
        <CardTitle>Why It Moved</CardTitle>
      </CardHeader>

      <div className="rounded-xl border border-border-tint bg-surface-muted/40 p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">{headline}</h3>
          {isRising ? (
            <TrendingUp className="h-4 w-4 text-gain" />
          ) : (
            <TrendingDown className="h-4 w-4 text-loss" />
          )}
        </div>
        <ul className="mt-3 space-y-2">
          {summaryBullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-2 text-sm text-foreground-secondary"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface-muted/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold",
                isLatestPositive ? "bg-gain-light text-gain" : "bg-loss-light text-loss"
              )}
            >
              {isLatestPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {formatPercent(latest.change_percent)}
            </span>
            <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {PRICE_EVENT_SOURCE_LABELS[latest.source]}
            </span>
          </div>
          <span className="text-xs text-muted">{formatEventTime(latest.created_at)}</span>
        </div>
        <p className="mt-2.5 text-sm font-semibold leading-snug text-foreground">
          {latest.reason}
        </p>
      </div>

      {previous.length > 0 && (
        <div className="mt-3.5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Previous Updates
          </p>
          {previous.map((event) => {
            const isPositive = event.change_percent >= 0;
            return (
              <div
                key={event.id}
                className="rounded-xl border border-border/80 bg-surface-muted/20 px-3.5 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "shrink-0 text-xs font-bold",
                        isPositive ? "text-gain" : "text-loss"
                      )}
                    >
                      {formatPercent(event.change_percent)}
                    </span>
                    <p className="truncate text-sm text-foreground-secondary">
                      {event.reason}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-light">
                    {formatEventTime(event.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
