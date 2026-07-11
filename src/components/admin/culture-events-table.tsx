"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  CULTURE_EVENT_STATUSES,
  CULTURE_EVENT_TYPES,
  type CultureEvent,
  type CultureEventStatus,
  type CultureEventType,
} from "@/lib/culture-intelligence/types";
import { cn } from "@/lib/utils";
import type { AssetExpectation } from "@/lib/culture-intelligence/expectation";
import { ExpectationTable } from "@/components/admin/expectation-table";
import { AttentionResolutionTable } from "@/components/admin/attention-resolution-table";
import { PriceV2ComparisonTable } from "@/components/admin/price-v2-comparison-table";
import type { MarketSimulation } from "@/lib/culture-intelligence/price-v2";

const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

const number = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });

const STATUS_STYLES: Record<CultureEventStatus, string> = {
  detected: "bg-primary-light text-primary",
  assessing: "bg-gold-subtle text-gold",
  active: "bg-gain-subtle text-gain",
  peaked: "bg-cat-tvshows-bg text-cat-tvshows-text",
  decaying: "bg-loss-light text-loss",
  archived: "bg-surface-muted text-muted",
};

export function CultureEventsTable({
  events,
  expectations,
  simulations,
}: {
  events: CultureEvent[];
  expectations: AssetExpectation[];
  simulations: MarketSimulation[];
}) {
  const [tab, setTab] = useState<"events" | "expectations" | "attention" | "price_v2">("events");
  const [status, setStatus] = useState<"all" | CultureEventStatus>("all");
  const [eventType, setEventType] = useState<"all" | CultureEventType>("all");

  const filtered = useMemo(
    () =>
      events.filter(
        (event) =>
          (status === "all" || event.status === status) &&
          (eventType === "all" || event.eventType === eventType)
      ),
    [events, eventType, status]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border">
        {(["events", "expectations", "attention", "price_v2"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-semibold capitalize",
              tab === value
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {value === "events"
              ? "Culture Events"
              : value === "expectations"
                ? "Expectation"
                : value === "attention"
                  ? "Attention"
                  : "Price v2"}
          </button>
        ))}
      </div>

      {tab === "price_v2" ? (
        <PriceV2ComparisonTable initialSimulations={simulations} />
      ) : tab === "attention" ? (
        <AttentionResolutionTable events={events} />
      ) : tab === "expectations" ? (
        <ExpectationTable expectations={expectations} />
      ) : (
      <Card className="overflow-hidden !p-0">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end">
        <label className="text-xs font-medium text-foreground-secondary">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | CultureEventStatus)}
            className="mt-1 block min-w-44 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All statuses</option>
            {CULTURE_EVENT_STATUSES.map((value) => (
              <option key={value} value={value}>{label(value)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-foreground-secondary">
          Event type
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value as "all" | CultureEventType)}
            className="mt-1 block min-w-48 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All event types</option>
            {CULTURE_EVENT_TYPES.map((value) => (
              <option key={value} value={value}>{label(value)}</option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted sm:ml-auto">{filtered.length} of {events.length} events</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1500px] w-full text-left text-xs">
          <thead className="bg-surface-muted text-[10px] uppercase tracking-wide text-muted">
            <tr>
              {[
                "Title", "Event Type", "Affected Assets", "Confidence", "Expected Attention",
                "Predicted Attention", "Sentiment", "Reach", "Time to Peak", "Decay Rate",
                "Status", "Created At",
              ].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((event) => (
              <tr key={event.id} className="align-top hover:bg-surface-muted/50">
                <td className="max-w-64 px-4 py-4 font-semibold text-foreground">{event.title}</td>
                <td className="px-4 py-4 text-foreground-secondary">{label(event.eventType)}</td>
                <td className="max-w-52 px-4 py-4 text-foreground-secondary">
                  {event.affectedAssets.map((asset) => asset.name).join(", ")}
                </td>
                <td className="px-4 py-4 tabular-nums">{Math.round(event.confidence * 100)}%</td>
                <td className="px-4 py-4 tabular-nums">{event.expectedAttention.toFixed(0)}</td>
                <td className="px-4 py-4 font-semibold tabular-nums text-primary">{event.predictedAttention.toFixed(0)}</td>
                <td className="px-4 py-4">{label(event.sentiment)}</td>
                <td className="px-4 py-4 tabular-nums">{number.format(event.reach)}</td>
                <td className="px-4 py-4 tabular-nums">{event.timeToPeakHours}h</td>
                <td className="px-4 py-4 tabular-nums">{event.decayRate.toFixed(2)}</td>
                <td className="px-4 py-4">
                  <span className={cn("rounded-md px-2 py-1 font-semibold", STATUS_STYLES[event.status])}>
                    {label(event.status)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-muted">
                  {new Date(event.createdAt).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="p-8 text-center text-sm text-muted">No events match these filters.</p>
      )}
      </Card>
      )}
    </div>
  );
}
