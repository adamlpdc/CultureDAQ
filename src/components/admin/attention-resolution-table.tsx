"use client";

import { Card } from "@/components/ui/card";
import { expectedAttentionOnFivePointScale } from "@/lib/culture-intelligence/attention";
import type { CultureEvent } from "@/lib/culture-intelligence/types";
import { cn } from "@/lib/utils";

function EventTable({ events, resolved }: { events: CultureEvent[]; resolved: boolean }) {
  return (
    <Card className="overflow-hidden !p-0">
      <div className="border-b border-border p-4">
        <p className="text-sm font-semibold text-foreground">
          {resolved ? "Resolved events" : "Pending events"}
        </p>
        <p className="mt-1 text-xs text-muted">
          {resolved
            ? "Clean Attention Engine outputs prepared for Price Engine v2."
            : "Awaiting an observed actual-attention score on the 1–5 scale."}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[950px] w-full text-left text-xs">
          <thead className="bg-surface-muted text-[10px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Assets</th>
              <th className="px-4 py-3">Expected vs Actual</th>
              <th className="px-4 py-3">Surprise</th>
              <th className="px-4 py-3">Momentum</th>
              <th className="px-4 py-3">Viral multiplier</th>
              <th className="px-4 py-3">Resolved at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((event) => {
              const expected = expectedAttentionOnFivePointScale(event.expectedAttention);
              const surprise = event.surpriseDelta;
              return (
                <tr key={event.id} className="align-top hover:bg-surface-muted/50">
                  <td className="max-w-64 px-4 py-4 font-semibold text-foreground">{event.title}</td>
                  <td className="px-4 py-4 text-foreground-secondary">
                    {event.affectedAssets.map((asset) => asset.name).join(", ")}
                  </td>
                  <td className="px-4 py-4 font-semibold tabular-nums">
                    {expected.toFixed(1)} → {event.actualAttention?.toFixed(1) ?? "Pending"}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-4 font-semibold tabular-nums",
                      surprise != null && surprise > 0 && "text-gain",
                      surprise != null && surprise < 0 && "text-loss",
                      surprise == null && "text-muted"
                    )}
                  >
                    {surprise == null ? "—" : `${surprise > 0 ? "+" : ""}${surprise.toFixed(2)}`}
                  </td>
                  <td className="px-4 py-4 font-semibold tabular-nums text-primary">
                    {event.momentumScore?.toFixed(1) ?? "—"}
                  </td>
                  <td className="px-4 py-4 tabular-nums">
                    {event.viralMultiplier == null ? "—" : `${event.viralMultiplier.toFixed(2)}×`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-muted">
                    {event.resolvedAt
                      ? new Date(event.resolvedAt).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Awaiting resolution"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {events.length === 0 && (
        <p className="p-8 text-center text-sm text-muted">
          No {resolved ? "resolved" : "pending"} events.
        </p>
      )}
    </Card>
  );
}

export function AttentionResolutionTable({ events }: { events: CultureEvent[] }) {
  const pending = events.filter((event) => event.resolvedAt == null);
  const resolved = events.filter((event) => event.resolvedAt != null);
  return (
    <div className="space-y-4">
      <EventTable events={pending} resolved={false} />
      <EventTable events={resolved} resolved />
    </div>
  );
}
