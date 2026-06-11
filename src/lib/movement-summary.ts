import type { Asset, AssetRankMovement, MarketEvent } from "@/types/database";
import type { CultureMoment } from "@/lib/culture-context";
import { formatMarketEventBullet } from "@/lib/market-events";
import {
  formatRankMovementBullet,
  getRankMovementCommentaryPriority,
} from "@/lib/rank-significance";
import { CATEGORY_MARKET_LABELS } from "@/lib/market-commentary";
import { getPriceChange } from "@/lib/utils";

const PRESSURE_RATIO_THRESHOLD = 1.15;
const MIN_PRESSURE = 0.25;
const CATEGORY_TREND_THRESHOLD = 0.25;

interface CommentaryCandidate {
  text: string;
  priority: number;
}

function categoryMomentumBullet(asset: Asset): string | null {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const label = CATEGORY_MARKET_LABELS[asset.category];

  if (change >= CATEGORY_TREND_THRESHOLD) {
    return `${label} are benefiting from strong category momentum`;
  }
  if (change <= -CATEGORY_TREND_THRESHOLD) {
    return `${label} have weakened across the market`;
  }
  return null;
}

function pressureBullet(asset: Asset): string | null {
  const buy = Number(asset.buy_pressure);
  const sell = Number(asset.sell_pressure);

  if (buy >= MIN_PRESSURE && buy > sell * PRESSURE_RATIO_THRESHOLD) {
    return "Fresh buying interest is supporting the price";
  }
  if (sell >= MIN_PRESSURE && sell > buy * PRESSURE_RATIO_THRESHOLD) {
    return "Recent selling activity has picked up";
  }
  if (buy >= MIN_PRESSURE && sell >= MIN_PRESSURE) {
    const ratio = buy / sell;
    if (ratio < 1 / PRESSURE_RATIO_THRESHOLD) {
      return "Recent buying activity has slowed";
    }
  }
  return null;
}

function cultureMomentBullet(moment: CultureMoment): string {
  return `${moment.title} remains active — ${moment.description.charAt(0).toLowerCase()}${moment.description.slice(1)}`;
}

function collectCandidates(
  asset: Asset,
  rankMovement: AssetRankMovement | null | undefined,
  events: MarketEvent[],
  cultureMoment?: CultureMoment | null
): CommentaryCandidate[] {
  const candidates: CommentaryCandidate[] = [];
  const byType = (type: MarketEvent["event_type"]) =>
    events.filter((e) => e.event_type === type);

  const rankBullet = rankMovement ? formatRankMovementBullet(rankMovement) : null;
  if (rankBullet && rankMovement) {
    candidates.push({
      text: rankBullet,
      priority: getRankMovementCommentaryPriority(rankMovement),
    });
  }

  for (const event of byType("cultural_moment")) {
    const text = formatMarketEventBullet(event, asset.category);
    if (text) candidates.push({ text, priority: 15 });
  }
  if (cultureMoment && !byType("cultural_moment").length) {
    candidates.push({ text: cultureMomentBullet(cultureMoment), priority: 15 });
  }

  const categoryEvents = byType("category_trending");
  if (categoryEvents.length > 0) {
    const text = formatMarketEventBullet(categoryEvents[0], asset.category);
    if (text) candidates.push({ text, priority: 30 });
  } else {
    const live = categoryMomentumBullet(asset);
    if (live) candidates.push({ text: live, priority: 30 });
  }

  const pressureEvents = [
    ...byType("buying_pressure"),
    ...byType("selling_pressure"),
  ].sort((a, b) => b.impact_score - a.impact_score);
  if (pressureEvents.length > 0) {
    const text = formatMarketEventBullet(pressureEvents[0], asset.category);
    if (text) candidates.push({ text, priority: 40 });
  } else {
    const live = pressureBullet(asset);
    if (live) candidates.push({ text: live, priority: 40 });
  }

  for (const event of byType("market_momentum")) {
    const text = formatMarketEventBullet(event, asset.category);
    if (text) candidates.push({ text, priority: 50 });
  }

  for (const event of byType("new_listing")) {
    const text = formatMarketEventBullet(event, asset.category);
    if (text) candidates.push({ text, priority: 60 });
  }

  return candidates;
}

/** Build Why It Moved bullets — highest-signal market commentary first. */
export function buildMovementBullets(
  asset: Asset,
  rankMovement: AssetRankMovement | null | undefined,
  events: MarketEvent[],
  cultureMoment?: CultureMoment | null,
  maxBullets = 4
): string[] {
  const sorted = collectCandidates(asset, rankMovement, events, cultureMoment).sort(
    (a, b) => a.priority - b.priority
  );

  const bullets: string[] = [];
  const used = new Set<string>();

  for (const { text } of sorted) {
    if (used.has(text) || bullets.length >= maxBullets) continue;
    used.add(text);
    bullets.push(text);
  }

  return bullets;
}

export function getMovementHeadline(asset: Asset): string {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const shortName = asset.name.split(/\s+/).slice(0, 2).join(" ");

  if (change > 0.5) return `Why ${shortName} Is Rising`;
  if (change < -0.5) return `Why ${shortName} Is Falling`;
  return `Why ${shortName} Is Moving`;
}

export function generateMovementSummary(
  asset: Asset,
  cultureMoment?: CultureMoment | null,
  rankMovement?: AssetRankMovement | null,
  marketEvents?: MarketEvent[]
): string[] {
  return buildMovementBullets(
    asset,
    rankMovement,
    marketEvents ?? [],
    cultureMoment
  );
}
