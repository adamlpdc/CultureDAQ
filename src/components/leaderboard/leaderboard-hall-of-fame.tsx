import type { HallOfFameEntry } from "@/lib/leaderboard-analytics";
import { Card } from "@/components/ui/card";

interface LeaderboardHallOfFameProps {
  entries: HallOfFameEntry[];
}

export function LeaderboardHallOfFame({ entries }: LeaderboardHallOfFameProps) {
  if (entries.length === 0) return null;

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground">Hall of Fame</h2>
        <p className="mt-0.5 text-[11px] text-muted">
          Records and milestones — leagues and seasons coming soon.
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {entries.map((entry) => (
          <Card
            key={entry.label}
            className="!p-3.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              {entry.emoji} {entry.label}
            </p>
            <p className="mt-1.5 truncate text-sm font-bold text-foreground">
              {entry.username === "—" ? entry.value : `@${entry.username}`}
            </p>
            {entry.username !== "—" && (
              <p className="text-stat mt-0.5 text-xs font-bold text-gold">{entry.value}</p>
            )}
            {entry.note && (
              <p className="mt-1 text-[10px] text-muted">{entry.note}</p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
