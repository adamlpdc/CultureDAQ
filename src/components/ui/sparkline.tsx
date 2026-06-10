"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  previousPrice: number;
  currentPrice: number;
  className?: string;
  width?: number;
  height?: number;
}

/** Mini trend line derived from price movement — visual only, no extra data fetch. */
export function Sparkline({
  previousPrice,
  currentPrice,
  className,
  width = 72,
  height = 28,
}: SparklineProps) {
  const isPositive = currentPrice >= previousPrice;
  const points = buildPoints(previousPrice, currentPrice, 10);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padding = 2;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (p - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${coords.join(" L ")}`;
  const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  const stroke = isPositive ? "var(--color-gain)" : "var(--color-loss)";
  const fill = isPositive ? "var(--color-gain-light)" : "var(--color-loss-light)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d={areaPath} fill={fill} opacity={0.6} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildPoints(previous: number, current: number, count: number): number[] {
  const delta = current - previous;
  const mid = previous + delta * 0.45;
  const wobble = Math.abs(delta) * 0.08 + previous * 0.002;

  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const base = previous + delta * t;
    const curve = Math.sin(t * Math.PI) * wobble * (i % 2 === 0 ? 1 : -0.6);
    if (i === count - 2) return mid;
    if (i === count - 1) return current;
    return base + curve;
  });
}
