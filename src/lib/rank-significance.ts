import type { AssetRankMovement } from "@/types/database";

export type RankMilestone =
  | "reached_number_one"
  | "entered_top_5"
  | "entered_top_10"
  | "entered_top_25"
  | "entered_top_50"
  | "lost_number_one"
  | "dropped_out_of_top_10"
  | "dropped_out_of_top_25"
  | "dropped_out_of_top_50";

export interface SignificantRankEvent {
  milestone: RankMilestone;
  headline: string;
  bullet: string;
  impactScore: number;
  isPositive: boolean;
  /** Lower = more important when sorting market commentary */
  priority: number;
}

const MILESTONE_PRIORITY: Record<RankMilestone, number> = {
  reached_number_one: 1,
  entered_top_10: 2,
  entered_top_25: 3,
  entered_top_50: 4,
  entered_top_5: 5,
  lost_number_one: 6,
  dropped_out_of_top_10: 7,
  dropped_out_of_top_25: 8,
  dropped_out_of_top_50: 9,
};

function event(
  milestone: RankMilestone,
  headline: string,
  bullet: string,
  impactScore: number,
  isPositive: boolean
): SignificantRankEvent {
  return {
    milestone,
    headline,
    bullet,
    impactScore,
    isPositive,
    priority: MILESTONE_PRIORITY[milestone],
  };
}

/**
 * Returns a rank narrative only when a major market tier is crossed.
 * Minor shuffles (e.g. #43 → #44) return null for commentary.
 */
export function detectSignificantRankEvent(
  previousRank: number,
  currentRank: number
): SignificantRankEvent | null {
  if (previousRank === currentRank) return null;

  if (currentRank < previousRank) {
    if (currentRank === 1 && previousRank > 1) {
      return event(
        "reached_number_one",
        "Reached #1",
        previousRank <= 5
          ? "Took the #1 spot as the market's top-ranked asset"
          : `Surged to #1 after climbing from #${previousRank}`,
        5,
        true
      );
    }
    if (previousRank > 5 && currentRank <= 5) {
      return event(
        "entered_top_5",
        "Entered Top 5",
        `Broke into the elite Top 5 from #${previousRank}`,
        5,
        true
      );
    }
    if (previousRank > 10 && currentRank <= 10) {
      return event(
        "entered_top_10",
        "Entered Top 10",
        `Entered the Top 10 after moving up from #${previousRank}`,
        4,
        true
      );
    }
    if (previousRank > 25 && currentRank <= 25) {
      return event(
        "entered_top_25",
        "Entered Top 25",
        `Climbed into the Top 25 from #${previousRank}`,
        3,
        true
      );
    }
    if (previousRank > 50 && currentRank <= 50) {
      return event(
        "entered_top_50",
        "Entered Top 50",
        `Moved into the Top 50 from #${previousRank}`,
        2,
        true
      );
    }
    return null;
  }

  if (previousRank === 1 && currentRank > 1) {
    return event(
      "lost_number_one",
      "Lost #1 Spot",
      `Ceded the #1 ranking and now sits at #${currentRank}`,
      5,
      false
    );
  }
  if (previousRank <= 10 && currentRank > 10) {
    return event(
      "dropped_out_of_top_10",
      "Dropped Out of Top 10",
      `Slipped out of the Top 10 and now ranks #${currentRank}`,
      4,
      false
    );
  }
  if (previousRank <= 25 && currentRank > 25) {
    return event(
      "dropped_out_of_top_25",
      "Dropped Out of Top 25",
      `Fell out of the Top 25 and now ranks #${currentRank}`,
      3,
      false
    );
  }
  if (previousRank <= 50 && currentRank > 50) {
    return event(
      "dropped_out_of_top_50",
      "Dropped Out of Top 50",
      `Dropped out of the Top 50 and now ranks #${currentRank}`,
      2,
      false
    );
  }

  return null;
}

export function getRankEventPriority(milestone: RankMilestone): number {
  return MILESTONE_PRIORITY[milestone];
}

/** Human-readable rank movement for asset detail stats (always shown). */
export function formatRankMovementLabel(
  movement: AssetRankMovement | null | undefined
): string {
  if (!movement || movement.isNewlyRanked) return "Newly Ranked";

  const { rankChange } = movement;
  if (rankChange == null || rankChange === 0) return "Rank Stable";

  if (rankChange > 0) {
    return `Moved Up ${rankChange} Place${rankChange === 1 ? "" : "s"}`;
  }

  const places = Math.abs(rankChange);
  return `Moved Down ${places} Place${places === 1 ? "" : "s"}`;
}

export function formatRankMovementBullet(
  movement: AssetRankMovement
): string | null {
  const { previousRank, rank, rankChange, isNewlyRanked } = movement;

  if (isNewlyRanked || previousRank == null) return null;
  if (rankChange == null || rankChange === 0) return null;

  const significant = detectSignificantRankEvent(previousRank, rank);
  if (significant) return significant.bullet;

  const places = Math.abs(rankChange);
  if (places >= 5) {
    return rankChange > 0
      ? `Gained ${places} places in the market rankings`
      : `Lost ${places} places in the market rankings`;
  }

  return null;
}

export function isSignificantRankMovement(
  movement: AssetRankMovement
): boolean {
  if (movement.isNewlyRanked || movement.previousRank == null) return false;
  if (movement.rankChange == null || movement.rankChange === 0) return false;
  return formatRankMovementBullet(movement) != null;
}

export function getRankMovementCommentaryPriority(
  movement: AssetRankMovement
): number {
  if (movement.isNewlyRanked || movement.previousRank == null) return 100;
  const significant = detectSignificantRankEvent(
    movement.previousRank,
    movement.rank
  );
  if (significant) return significant.priority;

  const change = movement.rankChange ?? 0;
  if (Math.abs(change) >= 5) return 10;
  return 100;
}
