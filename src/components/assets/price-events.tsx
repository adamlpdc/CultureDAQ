import { MessageCircle } from "lucide-react";
import type { PriceEvent } from "@/types/database";
import { formatPercent } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface PriceEventsProps {
  events: PriceEvent[];
}

export function PriceEvents({ events }: PriceEventsProps) {
  if (events.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={MessageCircle}
          title="No price movements yet"
          description="Price explanations will appear here after the market updates."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Why It Moved</CardTitle>
      </CardHeader>
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border border-border bg-surface-elevated p-3"
          >
            <div className="mb-1 flex items-center justify-between text-sm">
              <span
                className={
                  event.change_percent >= 0 ? "text-gain" : "text-loss"
                }
              >
                {formatPercent(event.change_percent)}
              </span>
              <span className="text-xs text-muted">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm">{event.reason}</p>
            <span className="mt-1 inline-block text-xs text-muted capitalize">
              {event.source.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
