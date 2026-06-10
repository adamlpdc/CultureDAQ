"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors, shadows } from "@/lib/colors";
import { cn, formatDaq } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type ChartRange = "1d" | "7d" | "30d" | "90d" | "1y" | "all";

const RANGES: { id: ChartRange; label: string; ms: number }[] = [
  { id: "1d", label: "1D", ms: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "7D", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", label: "30D", ms: 30 * 24 * 60 * 60 * 1000 },
  { id: "90d", label: "90D", ms: 90 * 24 * 60 * 60 * 1000 },
  { id: "1y", label: "1Y", ms: 365 * 24 * 60 * 60 * 1000 },
  { id: "all", label: "ALL", ms: Infinity },
];

const MAX_POINTS = 120;
const FLAT_THRESHOLD = 0.001;

function downsample<T>(items: T[], maxPoints: number): T[] {
  if (items.length <= maxPoints) return items;
  const step = Math.ceil(items.length / maxPoints);
  return items.filter((_, i) => i % step === 0 || i === items.length - 1);
}

function isChartFlat(values: number[]): boolean {
  if (values.length < 2) return true;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (avg <= 0) return true;
  return (max - min) / avg < FLAT_THRESHOLD;
}

interface PortfolioChartProps {
  data: { total_value: number; recorded_at: string }[];
  currentValue: number;
}

export function PortfolioChart({ data, currentValue }: PortfolioChartProps) {
  const [range, setRange] = useState<ChartRange>("7d");

  const filteredData = useMemo(() => {
    if (data.length === 0) return [];
    const rangeConfig = RANGES.find((r) => r.id === range)!;
    const cutoff =
      rangeConfig.ms === Infinity ? 0 : Date.now() - rangeConfig.ms;
    return data.filter((d) => new Date(d.recorded_at).getTime() >= cutoff);
  }, [data, range]);

  const chartData = useMemo(() => {
    const source =
      filteredData.length > 0
        ? filteredData
        : data.length > 0
          ? [data[data.length - 1]]
          : [];

    if (source.length === 0) {
      return [{ time: "Now", value: currentValue }];
    }

    const mapped = source.map((d) => ({
      time: new Date(d.recorded_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: range === "1d" ? "2-digit" : undefined,
        minute: range === "1d" ? "2-digit" : undefined,
      }),
      value: Number(d.total_value),
    }));

    return downsample(mapped, MAX_POINTS);
  }, [filteredData, data, currentValue, range]);

  const values = chartData.map((d) => d.value);
  const min = Math.min(...values) * 0.995;
  const max = Math.max(...values) * 1.005;
  const isUp = values.length >= 2 ? values[values.length - 1] >= values[0] : true;
  const showFlatHint = data.length < 3 || isChartFlat(values);

  return (
    <Card className="!p-4 md:!p-5">
      <CardHeader className="mb-2 flex-col items-start gap-3 sm:flex-row sm:items-center">
        <CardTitle className="text-sm">Portfolio Performance</CardTitle>
        <div className="flex w-full flex-wrap gap-1 rounded-xl bg-surface-muted p-1 sm:w-auto">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={cn(
                "min-w-[2.5rem] rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all",
                range === r.id
                  ? "bg-surface text-primary shadow-card ring-1 ring-border-tint"
                  : "text-muted hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <div className="relative h-56 w-full sm:h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isUp ? colors.chartGradient : colors.loss}
                  stopOpacity={0.22}
                />
                <stop
                  offset="100%"
                  stopColor={isUp ? colors.chartGradient : colors.loss}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fill: colors.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={32}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fill: colors.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: "12px",
                color: colors.foreground,
                boxShadow: shadows.cardHover,
                fontSize: 12,
              }}
              formatter={(value: number) => [formatDaq(value), "Portfolio"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isUp ? colors.chart : colors.loss}
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {showFlatHint && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
            <p className="rounded-lg border border-border/80 bg-surface/90 px-3 py-1.5 text-center text-[11px] leading-snug text-muted shadow-card backdrop-blur-sm">
              Portfolio performance will build as your assets move.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
