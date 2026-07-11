"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { colors, shadows } from "@/lib/colors";
import { deriveAttentionState } from "@/lib/attention/engine";
import {
  buildLifecycleHistory,
  formatCatalystCountdown,
  getAllUpcomingCatalysts,
  getAttentionHeatLevel,
  getProjectedGain,
  projectAttention30Days,
  rankAssetsByUpcomingAttention,
} from "@/lib/attention/projection";
import type {
  AssetProjection,
  AttentionState,
  SimulatedAsset,
} from "@/lib/attention/types";
import { cn, formatPercent } from "@/lib/utils";
import { Clock, Flame, Scale, Sparkles, TrendingUp } from "lucide-react";

const STATE_STYLES: Record<AttentionState, string> = {
  dormant: "bg-surface-muted text-muted border-border",
  emerging: "bg-primary-light text-primary border-primary-muted",
  hot: "bg-gain-subtle text-gain border-gain-muted",
  peak: "bg-gold-subtle text-gold border-gold-muted",
  cooling: "bg-cat-tvshows-bg text-cat-tvshows-text border-cat-tvshows-border",
};

function AttentionStateBadge({ state }: { state: AttentionState }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        STATE_STYLES[state]
      )}
    >
      {state}
    </span>
  );
}

function formatSimTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function heatColor(score: number): string {
  const t = getAttentionHeatLevel(score);
  if (t < 0.25) return `rgba(120, 113, 108, ${0.15 + t * 0.4})`;
  if (t < 0.5) return `rgba(55, 48, 163, ${0.2 + t * 0.5})`;
  if (t < 0.75) return `rgba(180, 83, 9, ${0.25 + t * 0.45})`;
  return `rgba(220, 38, 38, ${0.3 + t * 0.4})`;
}

function heatBorder(score: number): string {
  const t = getAttentionHeatLevel(score);
  if (t < 0.25) return colors.muted;
  if (t < 0.5) return colors.primary;
  if (t < 0.75) return colors.gold;
  return colors.loss;
}

export function UpcomingCatalystsPanel({
  assets,
  simTime,
  selectedSlug,
  onSelectAsset,
}: {
  assets: SimulatedAsset[];
  simTime: string;
  selectedSlug: string;
  onSelectAsset: (slug: string) => void;
}) {
  const catalysts = useMemo(
    () => getAllUpcomingCatalysts(assets, simTime),
    [assets, simTime]
  );

  const ranked = useMemo(
    () => rankAssetsByUpcomingAttention(assets, simTime).slice(0, 5),
    [assets, simTime]
  );

  return (
    <Card className="!p-4">
      <CardHeader className="mb-3 flex-row items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm">Upcoming Catalysts</CardTitle>
      </CardHeader>

      {ranked.length > 0 && (
        <div className="mb-4 rounded-xl border border-gold-muted bg-gold-subtle p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gold">
            Likely to gain attention next
          </p>
          <ul className="mt-2 space-y-1.5">
            {ranked.map((item, i) => (
              <li key={item.slug} className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onSelectAsset(item.slug)}
                  className={cn(
                    "truncate text-left font-medium hover:underline",
                    item.slug === selectedSlug ? "text-primary" : "text-foreground"
                  )}
                >
                  {i + 1}. {item.name}
                </button>
                <span className="shrink-0 tabular-nums text-gain">
                  +{item.projectedGain.toFixed(0)} proj.
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {catalysts.length === 0 ? (
        <p className="text-sm text-muted">No scheduled catalysts in the sandbox window.</p>
      ) : (
        <ul className="space-y-2">
          {catalysts.map((c) => {
            const countdown = formatCatalystCountdown(c.scheduledAt, simTime);
            return (
              <li
                key={c.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  c.assetSlug === selectedSlug
                    ? "border-primary-muted bg-primary-subtle"
                    : "border-border bg-surface-muted"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectAsset(c.assetSlug)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {c.title}
                      </p>
                      <p className="text-xs text-muted">
                        {c.assetName}
                        {c.source ? ` · ${c.source}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold tabular-nums",
                        countdown.urgency === "soon" && "bg-loss-light text-loss",
                        countdown.urgency === "medium" && "bg-gold-subtle text-gold",
                        countdown.urgency === "far" && "bg-surface text-muted"
                      )}
                    >
                      {countdown.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    {formatSimTime(c.scheduledAt)} · Impact {c.expectedImpact}/5
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function AttentionHeatMap({
  assets,
  simTime,
  selectedSlug,
  onSelectAsset,
}: {
  assets: SimulatedAsset[];
  simTime: string;
  selectedSlug: string;
  onSelectAsset: (slug: string) => void;
}) {
  const enriched = useMemo(
    () =>
      assets.map((asset) => {
        const projection = projectAttention30Days(asset, simTime);
        const state =
          asset.lastTick?.attentionState ?? deriveAttentionState(asset, simTime);
        return { asset, projection, state };
      }),
    [assets, simTime]
  );

  return (
    <Card className="!p-4">
      <CardHeader className="mb-3 flex-row items-center gap-2">
        <Flame className="h-4 w-4 text-gold" />
        <CardTitle className="text-sm">Attention Heat</CardTitle>
      </CardHeader>
      <p className="mb-3 text-xs text-muted">
        Current cultural heat · brighter = hotter · label shows projected 30d peak
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {enriched.map(({ asset, projection, state }) => {
          const heat = asset.attentionScore;
          const projected = projection.projectedPeak;
          const selected = asset.slug === selectedSlug;

          return (
            <button
              key={asset.slug}
              type="button"
              onClick={() => onSelectAsset(asset.slug)}
              className={cn(
                "relative rounded-xl border-2 p-3 text-left transition-all",
                selected && "ring-2 ring-primary ring-offset-1"
              )}
              style={{
                backgroundColor: heatColor(heat),
                borderColor: selected ? colors.primary : heatBorder(heat),
              }}
            >
              <p className="truncate text-xs font-bold text-foreground">{asset.name}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                {heat.toFixed(0)}
              </p>
              <AttentionStateBadge state={state} />
              <p className="mt-2 text-[10px] text-foreground-secondary">
                Peak ~{projected.toFixed(0)} · day {projection.projectedPeakDay}
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function LifecycleHistoryPanel({
  asset,
  simTime,
  projection,
}: {
  asset: SimulatedAsset;
  simTime: string;
  projection: AssetProjection;
}) {
  const entries = useMemo(
    () => buildLifecycleHistory(asset, simTime, projection),
    [asset, simTime, projection]
  );

  return (
    <Card className="!p-4">
      <CardHeader className="mb-3 flex-row items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm">Attention Lifecycle History</CardTitle>
      </CardHeader>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">
          Advance time or trigger events to build lifecycle history.
        </p>
      ) : (
        <ol className="relative space-y-0 border-l border-border pl-4">
          {entries.map((entry, i) => (
            <li key={`${entry.simTime}-${i}`} className="relative pb-4 last:pb-0">
              <span
                className={cn(
                  "absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface",
                  entry.isProjected ? "bg-primary-muted" : "bg-primary"
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                <AttentionStateBadge state={entry.attentionState} />
                {entry.isProjected && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-primary">
                    projected
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">{formatSimTime(entry.simTime)}</p>
              <p className="text-xs text-foreground-secondary">
                Attention {entry.attentionScore.toFixed(1)}
                {!entry.isProjected && entry.changePercent !== 0 && (
                  <span
                    className={cn(
                      "ml-2 font-semibold",
                      entry.changePercent >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(entry.changePercent)}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function AttentionProjectionChart({
  asset,
  simTime,
  projection,
}: {
  asset: SimulatedAsset;
  simTime: string;
  projection: AssetProjection;
}) {
  const chartData = useMemo(() => {
    const historical = asset.history
      .filter((h) => new Date(h.simTime).getTime() <= new Date(simTime).getTime())
      .slice(-14)
      .map((h) => ({
        label: new Date(h.simTime).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
        }),
        actual: h.attentionScore,
        projected: null as number | null,
      }));

    const projected = projection.points.map((p) => ({
      label: p.isProjected ? `+${p.dayOffset}d` : "Now",
      actual: p.isProjected ? null : p.attentionScore,
      projected: p.attentionScore,
    }));

    return [...historical, ...projected.slice(1)];
  }, [asset.history, simTime, projection]);

  const gain = getProjectedGain(projection);

  return (
    <Card className="!p-4 md:!p-5">
      <CardHeader className="mb-2 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">30-Day Attention Projection</CardTitle>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-muted">
            Now: <strong className="text-foreground">{projection.currentAttention.toFixed(1)}</strong>
          </span>
          <span className="text-muted">
            Peak:{" "}
            <strong className="text-gold">{projection.projectedPeak.toFixed(1)}</strong> (day{" "}
            {projection.projectedPeakDay})
          </span>
          <span className={cn("font-semibold", gain >= 0 ? "text-gain" : "text-loss")}>
            {gain >= 0 ? "+" : ""}
            {gain.toFixed(1)} projected
          </span>
        </div>
      </CardHeader>

      {projection.transitions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {projection.transitions.slice(0, 6).map((t) => (
            <span
              key={t.simTime + t.label}
              className="rounded-md bg-surface-muted px-2 py-0.5 text-[10px] text-foreground-secondary"
            >
              {t.label}
            </span>
          ))}
        </div>
      )}

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: colors.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: colors.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: "12px",
                fontSize: 12,
                boxShadow: shadows.cardHover,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine
              y={asset.baselineRelevance}
              stroke={colors.muted}
              strokeDasharray="4 4"
              label={{ value: "Baseline", fill: colors.muted, fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke={colors.gold}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="projected"
              name="Projected"
              stroke={colors.primary}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function AssetForwardOutlook({
  asset,
  simTime,
  projection,
}: {
  asset: SimulatedAsset;
  simTime: string;
  projection: AssetProjection;
}) {
  const nextCatalyst = asset.catalysts
    .filter((c) => new Date(c.scheduledAt).getTime() > new Date(simTime).getTime())
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )[0];

  const countdown = nextCatalyst
    ? formatCatalystCountdown(nextCatalyst.scheduledAt, simTime)
    : null;

  return (
    <Card className="!p-4">
      <CardHeader className="mb-3">
        <CardTitle className="text-sm">Forward Outlook — {asset.name}</CardTitle>
      </CardHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Current attention
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums">{asset.attentionScore.toFixed(1)}</p>
          <AttentionStateBadge state={projection.currentState} />
        </div>
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Expectation score
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-primary">
            {asset.expectationScore.toFixed(0)}
          </p>
          <p className="text-xs text-muted">Market hype priced in</p>
        </div>
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            30d projected peak
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-gold">
            {projection.projectedPeak.toFixed(1)}
          </p>
          <p className="text-xs text-muted">Around day {projection.projectedPeakDay}</p>
        </div>
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Expected transitions
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {projection.transitions.length}
          </p>
          <p className="text-xs text-muted">
            {projection.transitions[0]?.label ?? "Stable near current state"}
          </p>
        </div>
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Next catalyst
          </p>
          {nextCatalyst && countdown ? (
            <>
              <p className="mt-1 truncate text-sm font-semibold">{nextCatalyst.title}</p>
              <p
                className={cn(
                  "text-sm font-bold tabular-nums",
                  countdown.urgency === "soon" ? "text-loss" : "text-primary"
                )}
              >
                {countdown.label}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">None scheduled</p>
          )}
        </div>
      </div>
    </Card>
  );
}

const VERDICT_STYLES = {
  beat: "text-gain bg-gain-subtle border-gain-muted",
  meet: "text-muted bg-surface-muted border-border",
  miss: "text-loss bg-loss-light border-loss-muted",
};

export function ExpectationVsRealityPanel({ asset }: { asset: SimulatedAsset }) {
  const lastOutcome = asset.recentOutcomes[0] ?? asset.lastTick?.lastOutcome;

  return (
    <Card className="!p-4">
      <CardHeader className="mb-3 flex-row items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm">Expectation vs Reality</CardTitle>
      </CardHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-primary-muted bg-primary-light p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
            Expectation score
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{asset.expectationScore.toFixed(0)}</p>
          <p className="text-xs text-muted">How much hype is baked in</p>
        </div>
        {lastOutcome ? (
          <>
            <div className="rounded-xl border border-border bg-surface-muted p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                Last outcome
              </p>
              <p className="mt-1 text-sm font-semibold">{lastOutcome.title}</p>
              <span
                className={cn(
                  "mt-1 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase",
                  VERDICT_STYLES[lastOutcome.verdict]
                )}
              >
                {lastOutcome.verdict}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                Surprise delta
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-bold tabular-nums",
                  lastOutcome.surpriseDelta >= 0 ? "text-gain" : "text-loss"
                )}
              >
                {lastOutcome.surpriseDelta >= 0 ? "+" : ""}
                {lastOutcome.surpriseDelta.toFixed(1)}
              </p>
              <p className="text-xs text-muted">
                Expected {lastOutcome.expectedImpact} → Actual {lastOutcome.actualImpact}
              </p>
            </div>
          </>
        ) : (
          <div className="sm:col-span-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted">
            No resolved events yet. Advance time or trigger a scenario to see surprise pricing.
          </div>
        )}
      </div>

      {asset.recentOutcomes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="pb-2 pr-2 font-semibold">Event</th>
                <th className="pb-2 pr-2 font-semibold">Expected</th>
                <th className="pb-2 pr-2 font-semibold">Actual</th>
                <th className="pb-2 pr-2 font-semibold">Δ</th>
                <th className="pb-2 font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {asset.recentOutcomes.map((o) => (
                <tr key={o.occurredAt + o.title} className="border-b border-border/60">
                  <td className="py-2 pr-2 font-medium">{o.title}</td>
                  <td className="py-2 pr-2 tabular-nums">{o.expectedImpact}</td>
                  <td className="py-2 pr-2 tabular-nums">{o.actualImpact}</td>
                  <td
                    className={cn(
                      "py-2 pr-2 font-semibold tabular-nums",
                      o.surpriseDelta >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {o.surpriseDelta >= 0 ? "+" : ""}
                    {o.surpriseDelta.toFixed(1)}
                  </td>
                  <td
                    className={cn(
                      "py-2 font-semibold tabular-nums",
                      o.priceImpulsePercent >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {formatPercent(o.priceImpulsePercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
