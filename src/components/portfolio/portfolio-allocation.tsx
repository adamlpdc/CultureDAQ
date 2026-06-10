"use client";

import Link from "next/link";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryAllocation } from "@/lib/portfolio-analytics";
import { CATEGORY_EMOJI } from "@/lib/asset-visual";
import { colors, shadows } from "@/lib/colors";
import { CategoryBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const BAR_COLORS = [
  colors.primary,
  colors.secondary,
  colors.gold,
  colors.gain,
  colors.chart,
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

interface PortfolioAllocationProps {
  allocation: CategoryAllocation[];
}

export function PortfolioAllocation({ allocation }: PortfolioAllocationProps) {
  if (allocation.length === 0) {
    return (
      <Card className="!p-4 md:!p-5">
        <CardHeader className="mb-2">
          <CardTitle className="text-sm">Portfolio Allocation</CardTitle>
        </CardHeader>
        <p className="text-xs leading-relaxed text-muted">
          Your category breakdown will appear here once you own assets.
        </p>
      </Card>
    );
  }

  const isSingleCategory = allocation.length === 1;
  const primary = allocation[0];
  const chartData = allocation.map((a) => ({
    name: a.label,
    percent: Math.round(a.percent * 10) / 10,
  }));

  return (
    <Card className="!p-4 md:!p-5">
      <CardHeader className="mb-2">
        <CardTitle className="text-sm">Portfolio Allocation</CardTitle>
      </CardHeader>

      {isSingleCategory ? (
        <div className="rounded-xl border border-border/80 bg-surface-muted/20 p-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
              style={{ background: `${BAR_COLORS[0]}20` }}
            >
              {CATEGORY_EMOJI[primary.category]}
            </div>
            <div className="min-w-0">
              <p className="text-xs leading-relaxed text-foreground-secondary">
                Your portfolio is currently{" "}
                <span className="font-bold text-foreground">
                  {primary.percent.toFixed(0)}% {primary.label}
                </span>
                .
              </p>
              <CategoryBadge size="sm" className="mt-2 w-fit" category={primary.category} />
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full"
              style={{ width: "100%", background: BAR_COLORS[0] }}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Explore other categories to spread exposure.{" "}
            <Link href="/market" className="font-semibold text-primary hover:underline">
              Browse market
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fill: colors.muted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "12px",
                    fontSize: 12,
                    boxShadow: shadows.cardHover,
                  }}
                  formatter={(value: number) => [`${value}%`, "Allocation"]}
                />
                <Bar dataKey="percent" radius={[0, 4, 4, 0]} barSize={14}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {allocation.map((a, i) => (
              <span
                key={a.category}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-surface-muted/30 px-2 py-1 text-[10px] font-semibold text-foreground-secondary"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
                />
                {CATEGORY_EMOJI[a.category]} {a.label} {a.percent.toFixed(0)}%
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
