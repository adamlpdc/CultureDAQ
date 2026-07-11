"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MarketSimulation } from "@/lib/culture-intelligence/price-v2";
import { cn, formatDaq, formatPercent } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

export function PriceV2ComparisonTable({
  initialSimulations,
}: {
  initialSimulations: MarketSimulation[];
}) {
  const [simulations, setSimulations] = useState(initialSimulations);
  const [replaying, setReplaying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const replay = async (simulation: MarketSimulation) => {
    const key = `${simulation.cultureEventId}:${simulation.assetSlug}`;
    setReplaying(key);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/culture-events/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: simulation.cultureEventId,
          assetSlug: simulation.assetSlug,
          replayAt: simulation.simulatedAt,
        }),
      });
      const body = (await response.json()) as {
        simulation?: MarketSimulation;
        persisted?: boolean;
        error?: string;
      };
      if (!response.ok || !body.simulation) throw new Error(body.error ?? "Replay failed");
      setSimulations((current) =>
        current.map((item) =>
          item.cultureEventId === simulation.cultureEventId && item.assetSlug === simulation.assetSlug
            ? body.simulation!
            : item
        )
      );
      setMessage(body.persisted ? "Replay stored in the sandbox table." : "Mock replay complete; no database write made.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Replay failed");
    } finally {
      setReplaying(null);
    }
  };

  return (
    <Card className="overflow-hidden !p-0">
      <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Live vs Price Engine v2</p>
          <p className="mt-1 text-xs text-muted">
            Live prices are read-only baselines. Replays calculate sandbox outputs only.
          </p>
        </div>
        {message && <p className="text-xs text-muted">{message}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full text-left text-xs">
          <thead className="bg-surface-muted text-[10px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Current live price</th>
              <th className="px-4 py-3">Simulated v2 price</th>
              <th className="px-4 py-3">Difference</th>
              <th className="px-4 py-3">% Change</th>
              <th className="px-4 py-3">Triggering CultureEvent</th>
              <th className="px-4 py-3">Reason for movement</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Replay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {simulations.map((simulation) => {
              const key = `${simulation.cultureEventId}:${simulation.assetSlug}`;
              const positive = simulation.priceImpact >= 0;
              return (
                <tr key={key} className="align-top hover:bg-surface-muted/50">
                  <td className="px-4 py-4 font-semibold text-foreground">{simulation.assetName}</td>
                  <td className="px-4 py-4 tabular-nums">{formatDaq(simulation.oldPrice)}</td>
                  <td className="px-4 py-4 font-semibold tabular-nums text-primary">
                    {formatDaq(simulation.simulatedPrice)}
                  </td>
                  <td className={cn("px-4 py-4 font-semibold tabular-nums", positive ? "text-gain" : "text-loss")}>
                    {positive ? "+" : ""}{formatDaq(simulation.priceImpact)}
                  </td>
                  <td className={cn("px-4 py-4 font-semibold tabular-nums", positive ? "text-gain" : "text-loss")}>
                    {formatPercent(simulation.changePercent)}
                  </td>
                  <td className="max-w-60 px-4 py-4 text-foreground-secondary">{simulation.cultureEventTitle}</td>
                  <td className="max-w-56 px-4 py-4">
                    <p className="font-medium text-foreground">{simulation.shortExplanation}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] font-semibold text-primary">
                        Full breakdown
                      </summary>
                      <p className="mt-2 text-[10px] leading-relaxed text-muted">
                        {simulation.detailedExplanation}
                      </p>
                      <ol className="mt-2 space-y-1 border-l border-border pl-2">
                        {simulation.explanationTrace.map((entry) => (
                          <li key={entry.signal} className="text-[10px] text-muted">
                            <span className="font-semibold text-foreground-secondary">{entry.label}:</span>{" "}
                            {entry.value} — {entry.interpretation}
                          </li>
                        ))}
                      </ol>
                    </details>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-muted">
                    {new Date(simulation.simulatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-4">
                    <Button size="sm" variant="secondary" disabled={replaying === key} onClick={() => replay(simulation)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      {replaying === key ? "Replaying…" : "Replay"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {simulations.length === 0 && (
        <p className="p-8 text-center text-sm text-muted">Resolve a CultureEvent to create a Price v2 simulation.</p>
      )}
    </Card>
  );
}
