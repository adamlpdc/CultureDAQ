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
import { cancelCultureEvent, createCultureEvent, editCultureEvent, resolveCultureEventAction, rollbackCultureEvent, verifyCultureEvent } from "@/actions/culture-events";

const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

const number = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });

const STATUS_STYLES: Record<CultureEventStatus, string> = {
  draft: "bg-surface-muted text-muted", verified: "bg-gain-subtle text-gain",
  resolved: "bg-primary-light text-primary", cancelled: "bg-loss-light text-loss",
};

export function CultureEventsTable({
  events,
  expectations,
  simulations,
  assets,
}: {
  events: CultureEvent[];
  expectations: AssetExpectation[];
  simulations: MarketSimulation[];
  assets: Array<{ id: string; slug: string; name: string }>;
}) {
  const [tab, setTab] = useState<"events" | "expectations" | "attention" | "price_v2">("events");
  const [status, setStatus] = useState<"all" | CultureEventStatus>("all");
  const [eventType, setEventType] = useState<"all" | CultureEventType>("all");
  const [verification, setVerification] = useState<"all" | "verified" | "unverified">("all");
  const [assetFilter, setAssetFilter] = useState("all");

  const filtered = useMemo(
    () =>
      events.filter(
        (event) =>
          (status === "all" || event.status === status) &&
          (eventType === "all" || event.eventType === eventType) &&
          (verification === "all" || event.isVerified === (verification === "verified")) &&
          (assetFilter === "all" || event.affectedAssets.some((asset) => asset.slug === assetFilter))
      ),
    [events, eventType, status, verification, assetFilter]
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
      <div className="space-y-4">
      <Card id="create-culture-event">
        <details open>
          <summary className="cursor-pointer font-semibold text-primary">Create manual CultureEvent</summary>
          <form action={createCultureEvent} className="mt-4 grid gap-3 md:grid-cols-3">
            <input name="title" required placeholder="Event title" className="rounded-lg border border-border bg-surface px-3 py-2" />
            <input name="source" required defaultValue="manual_admin" placeholder="Source" className="rounded-lg border border-border bg-surface px-3 py-2" />
            <input name="source_url" type="url" placeholder="Source URL (optional)" className="rounded-lg border border-border bg-surface px-3 py-2" />
            <textarea name="description" required placeholder="Description" className="rounded-lg border border-border bg-surface px-3 py-2 md:col-span-3" />
            <select name="event_type" required className="rounded-lg border border-border bg-surface px-3 py-2">{CULTURE_EVENT_TYPES.map((v)=><option key={v} value={v}>{label(v)}</option>)}</select>
            <select name="sentiment" required className="rounded-lg border border-border bg-surface px-3 py-2"><option value="positive">Positive</option><option value="negative">Negative</option><option value="neutral">Neutral</option><option value="mixed">Mixed</option></select>
            <select name="affected_assets" multiple required className="min-h-28 rounded-lg border border-border bg-surface px-3 py-2">{assets.map((a)=><option key={a.id} value={a.slug}>{a.name}</option>)}</select>
            <label>Confidence %<input name="confidence" type="number" min="0" max="100" defaultValue="70" required className="block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
            <label>Expected attention (0–100)<input name="expected_attention" type="number" min="0" max="100" defaultValue="50" required className="block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
            <label>Actual attention (optional, 1–5)<input name="actual_attention" type="number" min="1" max="5" step="0.1" className="block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
            <label>Reach<input name="reach" type="number" min="0" defaultValue="0" required className="block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
            <label>Time to peak (hours)<input name="time_to_peak" type="number" min="0" defaultValue="6" required className="block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
            <label>Decay rate<input name="decay_rate" type="number" min="0" max="1" step="0.01" defaultValue="0.1" required className="block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
            <button className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">Create draft</button>
          </form>
        </details>
      </Card>
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
        <label className="text-xs font-medium">Verification<select value={verification} onChange={(e)=>setVerification(e.target.value as typeof verification)} className="mt-1 block rounded-lg border border-border bg-surface px-3 py-2"><option value="all">All</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select></label>
        <label className="text-xs font-medium">Asset<select value={assetFilter} onChange={(e)=>setAssetFilter(e.target.value)} className="mt-1 block rounded-lg border border-border bg-surface px-3 py-2"><option value="all">All assets</option>{assets.map((a)=><option key={a.id} value={a.slug}>{a.name}</option>)}</select></label>
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
                "Verified", "Status", "Preview", "Actions", "Created At",
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
                <td className="px-4 py-4 font-semibold">{event.isVerified ? "Yes" : "No"}</td>
                <td className="px-4 py-4">
                  <span className={cn("rounded-md px-2 py-1 font-semibold", STATUS_STYLES[event.status])}>
                    {label(event.status)}
                  </span>
                </td>
                <td className="px-4 py-4">{event.isVerified ? "Eligible once per asset" : `${event.sentiment === "positive" ? "+" : event.sentiment === "negative" ? "−" : "±"}${(event.expectedAttention * event.confidence * 0.003).toFixed(2)}% before caps`}</td>
                <td className="min-w-64 space-y-2 px-4 py-4">
                  {!event.isVerified && event.status === "draft" && <>
                    <form action={verifyCultureEvent}><input type="hidden" name="id" value={event.id}/><input name="actual_attention" type="number" min="1" max="5" step="0.1" placeholder="Actual 1–5 (optional)" className="mb-1 w-36 border"/><label className="flex gap-2 text-[11px]"><input type="checkbox" name="confirmation" value="CONFIRM_VERIFIED_EVENT_PRICING" required/>Confirm event may enter pricing</label><button className="mt-1 rounded bg-gain px-2 py-1 text-white">Verify</button></form>
                    <details><summary className="cursor-pointer text-primary">Edit</summary><form action={editCultureEvent} className="space-y-1"><input type="hidden" name="id" value={event.id}/><input name="title" defaultValue={event.title} className="w-full border"/><textarea name="description" defaultValue={event.description} className="w-full border"/><input type="hidden" name="source" value={event.sourceName}/><input type="hidden" name="source_url" value={event.sourceUrl ?? ""}/><input type="hidden" name="event_type" value={event.eventType}/><input type="hidden" name="sentiment" value={event.sentiment}/><input type="hidden" name="confidence" value={event.confidence*100}/><input type="hidden" name="expected_attention" value={event.expectedAttention}/><input type="hidden" name="reach" value={event.reach}/><input type="hidden" name="time_to_peak" value={event.timeToPeakHours}/><input type="hidden" name="decay_rate" value={event.decayRate}/><select name="affected_assets" multiple defaultValue={event.affectedAssets.map(a=>a.slug)} className="w-full border">{assets.map(a=><option key={a.id} value={a.slug}>{a.name}</option>)}</select><button className="rounded bg-primary px-2 py-1 text-white">Save</button></form></details>
                  </>}
                  {event.isVerified && event.status === "verified" && <><form action={resolveCultureEventAction}><input type="hidden" name="id" value={event.id}/><input name="actual_attention" type="number" min="1" max="5" step="0.1" required placeholder="Actual 1–5" className="w-24 border"/><button className="ml-1 rounded bg-primary px-2 py-1 text-white">Resolve</button></form><form action={rollbackCultureEvent}><input type="hidden" name="id" value={event.id}/><button className="text-gold">Emergency rollback</button></form></>}
                  {event.status !== "cancelled" && event.status !== "resolved" && <form action={cancelCultureEvent}><input type="hidden" name="id" value={event.id}/><button className="text-loss">Cancel</button></form>}
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
      </div>
      )}
    </div>
  );
}
