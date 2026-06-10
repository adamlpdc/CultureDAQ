"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDaq } from "@/lib/utils";

interface PriceChartProps {
  data: { price: number; recorded_at: string }[];
  currentPrice: number;
}

export function PriceChart({ data, currentPrice }: PriceChartProps) {
  const chartData =
    data.length > 0
      ? data.map((d) => ({
          time: new Date(d.recorded_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          price: Number(d.price),
        }))
      : [{ time: "Now", price: currentPrice }];

  const minPrice = Math.min(...chartData.map((d) => d.price)) * 0.98;
  const maxPrice = Math.max(...chartData.map((d) => d.price)) * 1.02;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(0)}`}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "#1a2332",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              color: "#f1f5f9",
            }}
            formatter={(value: number) => [formatDaq(value), "Price"]}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
