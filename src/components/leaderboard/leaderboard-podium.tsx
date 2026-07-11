import type { EnrichedLeaderboardEntry } from "@/lib/leaderboard-analytics";
import { TraderAvatar } from "@/components/leaderboard/trader-avatar";
import { LeaderboardBadgeGroup } from "@/components/leaderboard/leaderboard-badges";
import { cn, displayUsername, formatDaq, formatPercent } from "@/lib/utils";

interface LeaderboardPodiumProps {
  entries: EnrichedLeaderboardEntry[];
}

function PodiumPlaceholder({ place }: { place: 1 | 2 | 3 }) {
  const heights = { 1: "order-2 md:-mt-2", 2: "order-1", 3: "order-3" };
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center rounded-2xl border border-dashed border-border/70 bg-surface-muted/20 p-4 text-center",
        heights[place]
      )}
    >
      <span className="text-lg opacity-40" aria-hidden>
        {medals[place]}
      </span>
      <p className="text-stat mt-1 text-xl font-bold text-muted/60">#{place}</p>
      <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border/80 bg-surface-muted/40 md:h-14 md:w-14">
        <span className="text-lg text-muted/50">?</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-muted">Open slot</p>
      <p className="mt-1 text-[11px] text-muted">Claim this rank</p>
    </div>
  );
}

function PodiumSlot({
  entry,
  place,
}: {
  entry: EnrichedLeaderboardEntry;
  place: 1 | 2 | 3;
}) {
  const heights = { 1: "order-2 md:-mt-2", 2: "order-1", 3: "order-3" };
  const sizes = { 1: "hero" as const, 2: "lg" as const, 3: "lg" as const };
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center rounded-2xl border p-4 text-center",
        place === 1
          ? "border-gold-muted bg-gold-subtle/40 shadow-elevated"
          : "border-border/80 bg-surface-muted/30",
        heights[place]
      )}
    >
      <span className="text-lg" aria-hidden>
        {medals[place]}
      </span>
      <p className="text-stat mt-1 text-xl font-bold text-foreground">#{place}</p>
      <TraderAvatar
        username={entry.username}
        avatarStyle={entry.avatar_style}
        size={sizes[place]}
        className="mt-2"
      />
      <p className="mt-2 truncate text-sm font-bold text-foreground">
        {displayUsername(entry.username)}
      </p>
      <p className="text-stat daq-price mt-1 text-base font-bold text-gold">
        {formatDaq(entry.total_value)}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xs font-bold",
          entry.totalReturnPercent >= 0 ? "text-gain" : "text-loss"
        )}
      >
        {formatPercent(entry.totalReturnPercent)}
      </p>
      <LeaderboardBadgeGroup badges={entry.badges} className="mt-2 justify-center" />
    </div>
  );
}

export function LeaderboardPodium({ entries }: LeaderboardPodiumProps) {
  const slots: Array<{ place: 1 | 2 | 3; entry?: EnrichedLeaderboardEntry }> = [
    { place: 2, entry: entries[1] },
    { place: 1, entry: entries[0] },
    { place: 3, entry: entries[2] },
  ];

  return (
    <section aria-label="Top 3 podium">
      <h2 className="mb-3 text-sm font-bold text-foreground">Top 3 Podium</h2>
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-end md:justify-center">
        {slots.map(({ place, entry }) =>
          entry ? (
            <PodiumSlot key={place} entry={entry} place={place} />
          ) : (
            <PodiumPlaceholder key={place} place={place} />
          )
        )}
      </div>
    </section>
  );
}
