"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_REPLAY_BALANCE,
  replayRunToCsv,
  type ReplayBalanceConfig,
  type ReplayRun,
} from "@/lib/culture-intelligence/replay-lab";
import { cn, formatDaq, formatPercent } from "@/lib/utils";
import { Download, Play, SlidersHorizontal } from "lucide-react";

const CONTROLS: Array<{
  key: keyof ReplayBalanceConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
}> = [
  { key: "surpriseMultiplier", label: "Surprise multiplier", min: 0.25, max: 5, step: 0.05, suffix: "×" },
  { key: "momentumMultiplier", label: "Momentum multiplier", min: 0.25, max: 8, step: 0.05, suffix: "×" },
  { key: "expectationDecayRate", label: "Expectation decay rate", min: 0.25, max: 5, step: 0.05, suffix: "×" },
  { key: "viralMultiplier", label: "Viral multiplier", min: 0.25, max: 4, step: 0.05, suffix: "×" },
  { key: "maximumDailyMovement", label: "Maximum daily movement", min: 1, max: 25, step: 0.5, suffix: "%" },
];

function downloadCsv(run: ReplayRun) {
  const blob = new Blob([replayRunToCsv(run)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${run.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "replay"}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReplayLab({ initialRun }: { initialRun: ReplayRun }) {
  const [config, setConfig] = useState<ReplayBalanceConfig>(DEFAULT_REPLAY_BALANCE);
  const [name, setName] = useState("Balanced replay");
  const [runs, setRuns] = useState<ReplayRun[]>([initialRun]);
  const [activeRunId, setActiveRunId] = useState(initialRun.id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const activeRun = runs.find((run) => run.id === activeRunId) ?? runs[0];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/replay-lab")
      .then((response) => response.json())
      .then((body: { runs?: ReplayRun[] }) => {
        if (cancelled || !body.runs?.length) return;
        setRuns((current) => {
          const known = new Set(current.map((run) => run.id));
          return [...body.runs!.filter((run) => !known.has(run.id)), ...current];
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const ranked = useMemo(
    () => [...activeRun.simulations].sort((a, b) => b.changePercent - a.changePercent),
    [activeRun]
  );
  const winners = ranked.slice(0, 3);
  const losers = [...ranked].reverse().slice(0, 3);

  const runBatch = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/replay-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config }),
      });
      const body = (await response.json()) as { run?: ReplayRun; persisted?: boolean; error?: string };
      if (!response.ok || !body.run) throw new Error(body.error ?? "Replay failed");
      setRuns((current) => [body.run!, ...current]);
      setActiveRunId(body.run.id);
      setMessage(body.persisted ? "Run saved to the sandbox history." : "Mock run saved for this browser session.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Replay failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="!p-4 md:!p-5">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Balancing controls</CardTitle>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {CONTROLS.map((control) => (
            <label key={control.key} className="text-xs font-medium text-foreground-secondary">
              <span className="flex justify-between gap-2">
                {control.label}
                <strong className="text-foreground">{config[control.key].toFixed(2)}{control.suffix}</strong>
              </span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={config[control.key]}
                onChange={(event) => setConfig((current) => ({
                  ...current,
                  [control.key]: Number(event.target.value),
                }))}
                className="mt-2 w-full accent-primary"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-medium text-foreground-secondary">
            Run name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </label>
          <Button onClick={runBatch} disabled={busy}>
            <Play className="h-4 w-4" />
            {busy ? "Running…" : "Run all historical events"}
          </Button>
          <Button variant="secondary" onClick={() => setConfig(DEFAULT_REPLAY_BALANCE)}>
            Reset balance
          </Button>
        </div>
        {message && <p className="mt-3 text-xs text-muted">{message}</p>}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Historical events", activeRun.statistics.eventCount],
          ["Asset simulations", activeRun.statistics.assetSimulationCount],
          ["Total divergence", formatDaq(activeRun.statistics.totalDivergence)],
          ["Average movement", formatPercent(activeRun.statistics.averageChangePercent)],
          ["Capped movements", activeRun.statistics.cappedCount],
        ].map(([label, value]) => (
          <Card key={String(label)} className="!p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {([[
          "Biggest winners",
          winners,
        ], [
          "Biggest losers",
          losers,
        ]] as const).map(([title, items]) => (
          <Card key={title} className="!p-4">
            <CardTitle className="text-sm">{title}</CardTitle>
            <ol className="mt-3 space-y-2">
              {items.map((simulation) => (
                <li key={`${simulation.cultureEventId}:${simulation.assetSlug}`} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{simulation.assetName}</p>
                    <p className="truncate text-[10px] text-muted">{simulation.cultureEventTitle}</p>
                  </div>
                  <span className={cn("font-bold tabular-nums", simulation.changePercent >= 0 ? "text-gain" : "text-loss")}>
                    {formatPercent(simulation.changePercent)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden !p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm">Simulation results</CardTitle>
            <p className="mt-1 text-xs text-muted">{activeRun.name} · {new Date(activeRun.createdAt).toLocaleString("en-GB")}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => downloadCsv(activeRun)}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left text-xs">
            <thead className="bg-surface-muted text-[10px] uppercase tracking-wide text-muted">
              <tr>{["Asset", "Live price", "Simulated price", "Divergence", "% change", "CultureEvent", "Why it moved"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeRun.simulations.map((simulation) => (
                <tr key={`${simulation.cultureEventId}:${simulation.assetSlug}`}>
                  <td className="px-4 py-4 font-semibold">{simulation.assetName}</td>
                  <td className="px-4 py-4 tabular-nums">{formatDaq(simulation.oldPrice)}</td>
                  <td className="px-4 py-4 font-semibold tabular-nums text-primary">{formatDaq(simulation.simulatedPrice)}</td>
                  <td className="px-4 py-4 tabular-nums">{formatDaq(Math.abs(simulation.priceImpact))}</td>
                  <td className={cn("px-4 py-4 font-semibold tabular-nums", simulation.changePercent >= 0 ? "text-gain" : "text-loss")}>{formatPercent(simulation.changePercent)}</td>
                  <td className="max-w-56 px-4 py-4 text-muted">{simulation.cultureEventTitle}</td>
                  <td className="max-w-80 px-4 py-4 text-foreground-secondary">{simulation.shortExplanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!p-4">
        <CardTitle className="text-sm">Simulation history</CardTitle>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => setActiveRunId(run.id)}
              className={cn(
                "rounded-xl border p-3 text-left",
                run.id === activeRun.id ? "border-primary-muted bg-primary-subtle" : "border-border bg-surface-muted"
              )}
            >
              <p className="font-semibold text-foreground">{run.name}</p>
              <p className="mt-1 text-[10px] text-muted">
                Avg {formatPercent(run.statistics.averageChangePercent)} · Divergence {formatDaq(run.statistics.totalDivergence)}
              </p>
              <p className="mt-2 text-[10px] text-muted">
                Surprise {run.config.surpriseMultiplier.toFixed(2)}× · Momentum {run.config.momentumMultiplier.toFixed(2)}× · Decay {run.config.expectationDecayRate.toFixed(2)}× · Viral {run.config.viralMultiplier.toFixed(2)}× · Cap {run.config.maximumDailyMovement.toFixed(1)}%
              </p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
