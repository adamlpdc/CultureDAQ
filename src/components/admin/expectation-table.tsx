"use client";

import { Card } from "@/components/ui/card";
import type { AssetExpectation } from "@/lib/culture-intelligence/expectation";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

const reach = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });

function Trend({ expectation }: { expectation: AssetExpectation }) {
  const change = expectation.currentExpectation - expectation.previousExpectation;
  const Icon = expectation.trend === "rising" ? ArrowUpRight : expectation.trend === "falling" ? ArrowDownRight : ArrowRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold capitalize",
        expectation.trend === "rising" && "text-gain",
        expectation.trend === "falling" && "text-loss",
        expectation.trend === "stable" && "text-muted"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {expectation.trend} ({change >= 0 ? "+" : ""}{change.toFixed(1)} / 24h)
    </span>
  );
}

export function ExpectationTable({ expectations }: { expectations: AssetExpectation[] }) {
  return (
    <Card className="overflow-hidden !p-0">
      <div className="border-b border-border p-4">
        <p className="text-sm font-semibold text-foreground">Asset expectations</p>
        <p className="mt-1 text-xs text-muted">
          Calculated from CultureEvent confidence, logarithmic reach, and predicted attention. Scores decay continuously.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full text-left text-xs">
          <thead className="bg-surface-muted text-[10px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Current expectation</th>
              <th className="px-4 py-3">Expectation trend</th>
              <th className="px-4 py-3">Contributing events</th>
              <th className="px-4 py-3">Decay timer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expectations.map((expectation) => (
              <tr key={expectation.assetSlug} className="align-top hover:bg-surface-muted/50">
                <td className="px-4 py-4 font-semibold text-foreground">{expectation.assetName}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-lg font-bold tabular-nums text-primary">
                      {expectation.currentExpectation.toFixed(0)}
                    </span>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${expectation.currentExpectation}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4"><Trend expectation={expectation} /></td>
                <td className="max-w-lg px-4 py-4">
                  <ul className="space-y-2">
                    {expectation.contributions.map((event) => (
                      <li key={event.eventId}>
                        <p className="font-medium text-foreground">{event.eventTitle}</p>
                        <p className="text-[10px] text-muted">
                          +{event.currentImpact.toFixed(1)} now · {Math.round(event.confidence * 100)}% confidence · {reach.format(event.reach)} reach
                        </p>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold tabular-nums">{expectation.decayTimerHours}h half-life</p>
                  <p className="mt-1 text-[10px] text-muted">Continuous exponential decay</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
