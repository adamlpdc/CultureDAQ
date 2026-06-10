"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors, shadows } from "@/lib/colors";
import { formatDaq } from "@/lib/utils";

interface PortfolioChartProps {
  data: { total_value: number; recorded_at: string }[];
  currentValue: number;
}

export function PortfolioChart({ data, currentValue }: PortfolioChartProps) {
  const chartData =
    data.length > 0
      ? data.map((d) => ({
          time: new Date(d.recorded_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value: Number(d.total_value),
        }))
      : [{ time: "Now", value: currentValue }];

  const values = chartData.map((d) => d.value);
  const min = Math.min(...values) * 0.995;
  const max = Math.max(...values) * 1.005;

  return (
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.chartGradient} stopOpacity={0.18} />
              <stop offset="100%" stopColor={colors.chartGradient} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tick={{ fill: colors.mutedLight, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[min, max]}
            tick={{ fill: colors.mutedLight, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={36}
            hide={chartData.length <= 1}
          />
          <Tooltip
            contentStyle={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: "10px",
              color: colors.foreground,
              boxShadow: shadows.cardHover,
              fontSize: "12px",
            }}
            formatter={(value: number) => [formatDaq(value), "Value"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.chart}
            strokeWidth={2}
            fill="url(#portfolioGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
