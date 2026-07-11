"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryBadge } from "@/components/ui/badge";
import { colors, shadows } from "@/lib/colors";
import { TICKS_PER_DAY } from "@/lib/attention/constants";
import { deriveAttentionState, getPriceChange24h } from "@/lib/attention/engine";
import {
  advanceSimulation,
  createInitialSimulation,
  resetSimulation,
  SAMPLE_EVENTS,
  setSelectedAsset,
  triggerSampleEvent,
} from "@/lib/attention/simulation";
import { projectAttention30Days, formatCatalystCountdown } from "@/lib/attention/projection";
import {
  AssetForwardOutlook,
  AttentionHeatMap,
  AttentionProjectionChart,
  ExpectationVsRealityPanel,
  LifecycleHistoryPanel,
  UpcomingCatalystsPanel,
} from "@/components/admin/attention-simulation-panels";
import type { AttentionState, SimulatedAsset, SimulationState } from "@/lib/attention/types";
import { cn, formatDaq, formatPercent } from "@/lib/utils";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  FastForward,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";

const STATE_STYLES: Record<AttentionState, string> = {
  dormant: "bg-surface-muted text-muted border-border",
  emerging: "bg-primary-light text-primary border-primary-muted",
  hot: "bg-gain-subtle text-gain border-gain-muted",
  peak: "bg-gold-subtle text-gold border-gold-muted",
  cooling: "bg-cat-tvshows-bg text-cat-tvshows-text border-cat-tvshows-border",
};

function downsample<T>(items: T[], maxPoints: number): T[] {
  if (items.length <= maxPoints) return items;
  const step = Math.ceil(items.length / maxPoints);
  return items.filter((_, i) => i % step === 0 || i === items.length - 1);
}

function formatSimTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function AssetRow({
  asset,
  simTime,
  selected,
  onSelect,
}: {
  asset: SimulatedAsset;
  simTime: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const state =
    asset.lastTick?.attentionState ?? deriveAttentionState(asset, simTime);
  const change24h = getPriceChange24h(asset, simTime);
  const startPrice = asset.history[0]?.price ?? asset.currentPrice;
  const totalChange = ((asset.currentPrice - startPrice) / startPrice) * 100;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-primary-muted bg-primary-subtle ring-1 ring-primary-muted"
          : "border-border bg-surface hover:border-border-light hover:bg-surface-muted"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{asset.name}</p>
          <CategoryBadge category={asset.category} size="xs" className="mt-1" />
        </div>
        <AttentionStateBadge state={state} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <p className="text-muted">Price</p>
          <p className="font-semibold tabular-nums">{formatDaq(asset.currentPrice)}</p>
        </div>
        <div>
          <p className="text-muted">24h</p>
          <p
            className={cn(
              "font-semibold tabular-nums",
              change24h >= 0 ? "text-gain" : "text-loss"
            )}
          >
            {formatPercent(change24h)}
          </p>
        </div>
        <div>
          <p className="text-muted">Attention</p>
          <p className="font-semibold tabular-nums">
            {asset.attentionScore.toFixed(1)}{" "}
            <span className="font-normal text-muted">
              / {asset.baselineRelevance.toFixed(0)} base
            </span>
          </p>
        </div>
        <div>
          <p className="text-muted">Expectation</p>
          <p className="font-semibold tabular-nums text-primary">
            {asset.expectationScore.toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-muted">Session</p>
          <p
            className={cn(
              "font-semibold tabular-nums",
              totalChange >= 0 ? "text-gain" : "text-loss"
            )}
          >
            {formatPercent(totalChange)}
          </p>
        </div>
      </div>

      {(asset.activeEvents.length > 0 || asset.catalysts.length > 0) && (
        <div className="mt-2 space-y-1 border-t border-border pt-2">
          {asset.activeEvents.slice(0, 1).map((e) => (
            <p key={e.id} className="truncate text-[10px] text-gain">
              ✓ {e.title}
            </p>
          ))}
          {asset.catalysts.slice(0, 1).map((c) => {
            const countdown = formatCatalystCountdown(c.scheduledAt, simTime);
            return (
              <p key={c.id} className="truncate text-[10px] text-primary">
                ◷ {c.title} · {countdown.label}
              </p>
            );
          })}
        </div>
      )}
    </button>
  );
}

function WhyItMovedPanel({ asset }: { asset: SimulatedAsset }) {
  const tick = asset.lastTick;

  if (!tick) {
    return (
      <Card className="!p-4">
        <CardTitle className="text-sm">Why It Moved</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Advance time or trigger an event to see lane breakdown.
        </p>
      </Card>
    );
  }

  return (
    <Card className="!p-4">
      <CardHeader className="mb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm">Why It Moved</CardTitle>
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            tick.changePercent >= 0 ? "text-gain" : "text-loss"
          )}
        >
          {formatPercent(tick.changePercent)}
        </span>
      </CardHeader>
      <p className="text-sm text-foreground-secondary">{tick.reason}</p>
      <ul className="mt-3 space-y-2">
        {tick.lanes.map((lane) => (
          <li
            key={lane.key}
            className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs"
          >
            <span className="text-foreground-secondary">{lane.label}</span>
            <span
              className={cn(
                "shrink-0 font-semibold tabular-nums",
                lane.impactPercent >= 0 ? "text-gain" : "text-loss"
              )}
            >
              {formatPercent(lane.impactPercent)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SimulationCharts({
  asset,
  simTime,
}: {
  asset: SimulatedAsset;
  simTime: string;
}) {
  const chartData = useMemo(() => {
    const cutoff = new Date(simTime).getTime() - 30 * 24 * 60 * 60 * 1000;
    const filtered = asset.history.filter(
      (h) => new Date(h.simTime).getTime() >= cutoff
    );
    const mapped = filtered.map((h) => ({
      time: new Date(h.simTime).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: h.price,
      attention: h.attentionScore,
      ts: new Date(h.simTime).getTime(),
    }));
    return downsample(mapped, 120);
  }, [asset.history, simTime]);

  const prices = chartData.map((d) => d.price);
  const minPrice = prices.length ? Math.min(...prices) * 0.98 : 0;
  const maxPrice = prices.length ? Math.max(...prices) * 1.02 : 100;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="!p-4 md:!p-5">
        <CardHeader className="mb-2">
          <CardTitle className="text-sm">30-Day Simulated Price</CardTitle>
        </CardHeader>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="simPriceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.chartGradient} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={colors.chartGradient} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: colors.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                tick={{ fill: colors.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => `${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "12px",
                  fontSize: 12,
                  boxShadow: shadows.cardHover,
                }}
                formatter={(value: number) => [formatDaq(value), "Price"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={colors.chart}
                strokeWidth={2}
                fill="url(#simPriceGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="!p-4 md:!p-5">
        <CardHeader className="mb-2">
          <CardTitle className="text-sm">Attention Score</CardTitle>
        </CardHeader>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: colors.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: colors.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "12px",
                  fontSize: 12,
                  boxShadow: shadows.cardHover,
                }}
                formatter={(value: number) => [value.toFixed(1), "Attention"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="attention"
                name="Attention"
                stroke={colors.gold}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export function AttentionSimulationPanel() {
  const [state, setState] = useState<SimulationState>(() => createInitialSimulation());
  const [busy, setBusy] = useState(false);

  const selected = state.assets.find((a) => a.slug === state.selectedSlug) ?? state.assets[0];

  const selectedProjection = useMemo(
    () => projectAttention30Days(selected, state.simTime),
    [selected, state.simTime]
  );

  const selectAsset = (slug: string) => {
    setState((prev) => setSelectedAsset(prev, slug));
  };

  const runAdvance = (ticks: number) => {
    setBusy(true);
    requestAnimationFrame(() => {
      setState((prev) => advanceSimulation(prev, ticks));
      setBusy(false);
    });
  };

  const handleEvent = (eventId: string) => {
    const event = SAMPLE_EVENTS.find((e) => e.id === eventId);
    if (!event) return;
    setState((prev) => {
      const next = triggerSampleEvent(prev, event);
      return { ...next, selectedSlug: event.slug };
    });
  };

  const simDay = Math.floor(state.tickCount / TICKS_PER_DAY);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attention Market Simulation"
        description="Expectation vs Reality sandbox — prices move on surprise (actual − expected), not automatic hype."
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          ← Admin
        </Link>
        <span className="text-muted">·</span>
        <span className="text-muted">
          Sim time: <strong className="text-foreground">{formatSimTime(state.simTime)}</strong>
        </span>
        <span className="text-muted">·</span>
        <span className="text-muted">
          Day <strong className="text-foreground">{simDay}</strong> ·{" "}
          <strong className="text-foreground">{state.tickCount}</strong> ticks
        </span>
      </div>

      <Card className="!p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Time controls</p>
            <p className="text-xs text-muted">Each tick = 15 minutes of simulated market time</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => runAdvance(1)}
            >
              <Play className="h-3.5 w-3.5" />
              +15 min
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => runAdvance(TICKS_PER_DAY)}
            >
              <Calendar className="h-3.5 w-3.5" />
              +1 day
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => runAdvance(TICKS_PER_DAY * 7)}
            >
              <FastForward className="h-3.5 w-3.5" />
              +7 days
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setState(resetSimulation())}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </Card>

      <Card className="!p-4">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-gold" />
          <p className="text-sm font-semibold text-foreground">Trigger expectation scenarios</p>
        </div>
        <p className="mb-3 text-xs text-muted">
          Price moves on surprise (actual − expected). High expectation + miss = drop.
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_EVENTS.map((event) => (
            <Button
              key={event.id}
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => handleEvent(event.id)}
              className="text-left"
            >
              {event.label}
            </Button>
          ))}
        </div>
      </Card>

      <AttentionHeatMap
        assets={state.assets}
        simTime={state.simTime}
        selectedSlug={state.selectedSlug}
        onSelectAsset={selectAsset}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <UpcomingCatalystsPanel
            assets={state.assets}
            simTime={state.simTime}
            selectedSlug={state.selectedSlug}
            onSelectAsset={selectAsset}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <p className="text-sm font-semibold text-foreground">Assets</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {state.assets.map((asset) => (
              <AssetRow
                key={asset.slug}
                asset={asset}
                simTime={state.simTime}
                selected={asset.slug === state.selectedSlug}
                onSelect={() => selectAsset(asset.slug)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
          <Card className="!p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">{selected.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <CategoryBadge category={selected.category} size="sm" />
                  <AttentionStateBadge
                    state={
                      selected.lastTick?.attentionState ??
                      deriveAttentionState(selected, state.simTime)
                    }
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {formatDaq(selected.currentPrice)}
                </p>
                <p className="text-xs text-muted">
                  Baseline {selected.baselineRelevance.toFixed(0)} · Attention{" "}
                  {selected.attentionScore.toFixed(1)} · Expectation{" "}
                  {selected.expectationScore.toFixed(0)}
                </p>
              </div>
            </div>

            {(selected.activeEvents.length > 0 || selected.catalysts.length > 0) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {selected.activeEvents.length > 0 && (
                  <div className="rounded-xl border border-gain-muted bg-gain-subtle p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gain">
                      Active verified events
                    </p>
                    <ul className="mt-2 space-y-1">
                      {selected.activeEvents.map((e) => (
                        <li key={e.id} className="text-xs text-foreground-secondary">
                          <span className="font-medium text-foreground">{e.title}</span>
                          <span className="text-muted"> — {e.source}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selected.catalysts.length > 0 && (
                  <div className="rounded-xl border border-primary-muted bg-primary-light p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                      Upcoming catalysts
                    </p>
                    <ul className="mt-2 space-y-1">
                      {selected.catalysts.map((c) => {
                        const countdown = formatCatalystCountdown(c.scheduledAt, state.simTime);
                        return (
                          <li key={c.id} className="text-xs text-foreground-secondary">
                            <span className="font-medium text-foreground">{c.title}</span>
                            <span className="text-muted">
                              {" "}
                              · {countdown.label} · {formatSimTime(c.scheduledAt)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>

          <AssetForwardOutlook
            asset={selected}
            simTime={state.simTime}
            projection={selectedProjection}
          />

          <ExpectationVsRealityPanel asset={selected} />

          <WhyItMovedPanel asset={selected} />

          <div className="grid gap-4 lg:grid-cols-2">
            <LifecycleHistoryPanel
              asset={selected}
              simTime={state.simTime}
              projection={selectedProjection}
            />
            <AttentionProjectionChart
              asset={selected}
              simTime={state.simTime}
              projection={selectedProjection}
            />
          </div>

          <SimulationCharts asset={selected} simTime={state.simTime} />
      </div>

      <Card className="!p-4">
        <p className="text-xs text-muted">
          <ChevronRight className="mr-1 inline h-3 w-3" />
          Sandbox only — production{" "}
          <code className="rounded bg-surface-muted px-1">calculateNewPrice</code> and live asset
          prices are unchanged. Engine lives in{" "}
          <code className="rounded bg-surface-muted px-1">src/lib/attention/</code>.
        </p>
      </Card>
    </div>
  );
}
