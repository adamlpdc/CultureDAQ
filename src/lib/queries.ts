import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasSupabaseAdminCredentials } from "@/lib/supabase/admin";
import type {
  Achievement,
  Asset,
  AssetCategory,
  HoldingWithAsset,
  LeaderboardEntry,
  MarketSort,
  PortfolioSummary,
  PriceEvent,
  Profile,
  TradeWithAsset,
} from "@/types/database";
import { getPriceChange } from "@/lib/utils";
import {
  computeHoldingsValue,
  computePortfolioChangePercent,
  computeTotalPortfolioValue,
} from "@/lib/portfolio-value";
import { normalizeAvatarStyle } from "@/lib/avatars";
import { resolveAssetSlug } from "@/lib/asset-slugs";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import {
  buildAchievementHighlights,
  type AchievementHighlight,
} from "@/lib/achievements";
import {
  buildAchievementCard,
  buildStatsFromCards,
  findUserAchievementRow,
  indexUserAchievements,
  resolveAchievementState,
} from "@/lib/achievements/achievement-state";
import {
  checkAndUnlockAchievements,
  loadAchievementCheckContext,
} from "@/lib/achievements/unlock";
import { filterVisibleAchievements, loadAchievementsCatalog } from "@/lib/achievements/catalog";
import type { AchievementProgressDetail } from "@/lib/achievements/progress-detail";
import { ACHIEVEMENT_SEED_COUNT } from "@/lib/achievements/seed-data";
import type { AchievementCategory } from "@/types/database";
import {
  assignLeaderboardBadges,
  buildHallOfFame,
  buildLeaderboardStats,
  computePeriodChange,
  enrichLeaderboardEntry,
  getPeriodMs,
  sortEntriesByPeriod,
  type EnrichedLeaderboardEntry,
  type HallOfFameEntry,
  type LeaderboardPeriod,
  type LeaderboardStats,
  type UserLeaderboardPosition,
} from "@/lib/leaderboard-analytics";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function getAssets(options?: {
  category?: AssetCategory;
  search?: string;
  sort?: MarketSort;
  featured?: boolean;
  limit?: number;
}): Promise<Asset[]> {
  const supabase = await createClient();
  let query = supabase.from("assets").select("*");

  if (options?.category) {
    query = query.eq("category", options.category);
  }
  if (options?.featured) {
    query = query.eq("featured", true);
  }
  if (options?.search) {
    const q = options.search.trim().toLowerCase();
    const matchedCategory = ALL_CATEGORIES.find(
      (c) =>
        CATEGORY_LABELS[c].toLowerCase().includes(q) ||
        c.replace(/_/g, " ").includes(q)
    );
    if (matchedCategory && q.length >= 3) {
      query = query.eq("category", matchedCategory);
    } else {
      const term = options.search.trim();
      query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
    }
  }

  const sort = options?.sort ?? "trending";
  switch (sort) {
    case "price_desc":
      query = query.order("current_price", { ascending: false });
      break;
    case "price_asc":
      query = query.order("current_price", { ascending: true });
      break;
    case "new_listings":
      query = query.order("created_at", { ascending: false });
      break;
    case "most_traded":
      query = query.order("trade_volume_24h", { ascending: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("trade_volume_24h", { ascending: false });
  }

  const needsMemorySort =
    sort === "gainers" || sort === "losers" || sort === "trending";

  if (options?.limit && !needsMemorySort) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  let assets = (data ?? []) as Asset[];

  if (needsMemorySort) {
    type AssetWithChange = Asset & { _change: number };
    let sorted: AssetWithChange[] = assets.map((a) => ({
      ...a,
      _change: getPriceChange(a.current_price, a.previous_price),
    }));

    sorted.sort((a, b) => {
      if (sort === "gainers") return b._change - a._change;
      if (sort === "losers") return a._change - b._change;
      return (
        b.trade_volume_24h * Math.abs(b._change) -
        a.trade_volume_24h * Math.abs(a._change)
      );
    });

    if (sort === "gainers") {
      sorted = sorted.filter((a) => a._change > 0);
    } else if (sort === "losers") {
      sorted = sorted.filter((a) => a._change < 0);
    }

    assets = sorted;
  }

  if (options?.limit) {
    assets = assets.slice(0, options.limit);
  }

  return assets;
}

export async function getAssetBySlug(slug: string): Promise<Asset | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("*")
    .eq("slug", resolveAssetSlug(slug))
    .single();
  return data;
}

export async function getAssetPriceHistory(
  assetId: string,
  limit = 2880
): Promise<{ price: number; recorded_at: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("asset_prices")
    .select("price, recorded_at")
    .eq("asset_id", assetId)
    .order("recorded_at", { ascending: true })
    .limit(limit);
  const history = data ?? [];
  const { data: actions } = await supabase
    .from("market_corporate_actions")
    .select("price_factor, effective_at")
    .eq("asset_id", assetId)
    .order("effective_at", { ascending: true });

  if (!actions?.length) return history;
  return history.map((point) => {
    const adjustment = actions.reduce((factor, action) => {
      return new Date(point.recorded_at).getTime() < new Date(action.effective_at).getTime()
        ? factor * Number(action.price_factor)
        : factor;
    }, 1);
    return { ...point, price: Number(point.price) * adjustment };
  });
}

export async function getPriceEvents(
  assetId: string,
  limit = 10
): Promise<PriceEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_events")
    .select("*")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getActiveMarketEventsForAsset(assetId: string) {
  const supabase = await createClient();
  const { getActiveAssetEvents } = await import("@/lib/market-events");
  return getActiveAssetEvents(supabase, assetId);
}

export async function getUserHoldings(
  userId: string
): Promise<HoldingWithAsset[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holdings")
    .select("*, asset:assets(*)")
    .eq("user_id", userId)
    .gt("shares", 0);
  return (data ?? []) as HoldingWithAsset[];
}

export async function getUserHolding(
  userId: string,
  assetId: string
): Promise<HoldingWithAsset | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holdings")
    .select("*, asset:assets(*)")
    .eq("user_id", userId)
    .eq("asset_id", assetId)
    .maybeSingle();
  return data;
}

export async function getUserTrades(
  userId: string,
  limit = 50
): Promise<TradeWithAsset[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trades")
    .select("*, asset:assets(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as TradeWithAsset[];
}

export async function getPortfolioSummary(
  userId: string
): Promise<PortfolioSummary | null> {
  const supabase = await createClient();
  const profile = await getProfile(userId);
  if (!profile) return null;

  const holdings = await getUserHoldings(userId);
  const holdingsValue = computeHoldingsValue(holdings);
  const totalValue = computeTotalPortfolioValue(profile.daq_balance, holdingsValue);

  const { data: snapshots } = await supabase
    .from("portfolio_snapshots")
    .select("total_value, recorded_at")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(48);

  let dayChangePercent: number | null = null;
  if (snapshots && snapshots.length >= 2) {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const baseline =
      snapshots.find((s) => new Date(s.recorded_at).getTime() <= dayAgo) ??
      snapshots[snapshots.length - 1];
    dayChangePercent = computePortfolioChangePercent(
      totalValue,
      baseline?.total_value
    );
  }

  return {
    daq_balance: profile.daq_balance,
    holdings_value: holdingsValue,
    total_value: totalValue,
    holdings_count: holdings.length,
    day_change_percent: dayChangePercent,
  };
}

type LeaderboardEntryInput = Omit<LeaderboardEntry, "avatar_style"> & {
  avatar_style?: string;
};

async function enrichLeaderboardEntriesWithAvatars(
  entries: LeaderboardEntryInput[]
): Promise<LeaderboardEntry[]> {
  if (entries.length === 0) return [];

  const userIds = entries.map((e) => e.user_id);
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, avatar_style")
    .in("user_id", userIds);

  const avatarByUser = new Map(
    (profiles ?? []).map((p) => [p.user_id, normalizeAvatarStyle(p.avatar_style)])
  );

  return entries.map((entry) => ({
    ...entry,
    avatar_style: normalizeAvatarStyle(
      entry.avatar_style ?? avatarByUser.get(entry.user_id)
    ),
  }));
}

async function getLatestLeaderboardSnapshotEntries(
  limit?: number
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  const { data: latestSnapshot } = await supabase
    .from("leaderboard_snapshots")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestSnapshot) return [];

  let query = supabase
    .from("leaderboard_snapshots")
    .select("*")
    .eq("recorded_at", latestSnapshot.recorded_at)
    .order("rank", { ascending: true });

  if (limit != null) {
    query = query.limit(limit);
  }

  const { data } = await query;
  return enrichLeaderboardEntriesWithAvatars(data ?? []);
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const snapshotEntries = await getLatestLeaderboardSnapshotEntries(limit);
  if (snapshotEntries.length > 0) return snapshotEntries;

  return computeLiveLeaderboard(limit);
}

async function computeLiveLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
  const entries = await computeAllLiveLeaderboardEntries();
  if (limit != null) {
    return entries.slice(0, limit);
  }
  return entries;
}

async function computeAllLiveLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  if (!hasSupabaseAdminCredentials()) {
    return getLatestLeaderboardSnapshotEntries();
  }

  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("*");

  if (!profiles) return [];

  const entries = await Promise.all(
    profiles.map(async (profile) => {
      const { data: holdings } = await admin
        .from("holdings")
        .select("shares, asset:assets(current_price)")
        .eq("user_id", profile.user_id);

      const holdingsValue = computeHoldingsValue(
        (holdings ?? []).map((h) => ({
          shares: h.shares,
          asset: h.asset as unknown as { current_price: number },
        }))
      );

      return {
        id: profile.id,
        user_id: profile.user_id,
        username: profile.username,
        avatar_style: normalizeAvatarStyle(profile.avatar_style),
        total_value: computeTotalPortfolioValue(profile.daq_balance, holdingsValue),
        rank: 0,
        recorded_at: new Date().toISOString(),
      };
    })
  );

  return entries
    .sort((a, b) => b.total_value - a.total_value)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

async function getPreviousLeaderboardRankMap(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data: batches } = await supabase
    .from("leaderboard_snapshots")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(2);

  if (!batches || batches.length < 2) return new Map();

  const { data } = await supabase
    .from("leaderboard_snapshots")
    .select("user_id, rank")
    .eq("recorded_at", batches[1].recorded_at);

  return new Map((data ?? []).map((r) => [r.user_id, r.rank]));
}

async function getTraderMetaMap(): Promise<
  Map<string, { created_at: string; holdingsCount: number }>
> {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, created_at");

  const holdingsCount = new Map<string, number>();
  if (hasSupabaseAdminCredentials()) {
    const admin = createAdminClient();
    const { data: holdings } = await admin.from("holdings").select("user_id");
    for (const h of holdings ?? []) {
      holdingsCount.set(h.user_id, (holdingsCount.get(h.user_id) ?? 0) + 1);
    }
  }

  const meta = new Map<string, { created_at: string; holdingsCount: number }>();
  for (const p of profiles ?? []) {
    meta.set(p.user_id, {
      created_at: p.created_at,
      holdingsCount: holdingsCount.get(p.user_id) ?? 0,
    });
  }
  return meta;
}

async function getPeriodChangeMap(
  userIds: string[],
  periodMs: number
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (userIds.length === 0) return result;

  const supabase = await createClient();
  const cutoff = new Date(Date.now() - periodMs).toISOString();

  const { data } = await supabase
    .from("portfolio_snapshots")
    .select("user_id, total_value, recorded_at")
    .in("user_id", userIds)
    .gte("recorded_at", cutoff)
    .order("recorded_at", { ascending: true });

  const byUser = new Map<string, { first: number; last: number }>();
  for (const row of data ?? []) {
    const val = Number(row.total_value);
    const existing = byUser.get(row.user_id);
    if (!existing) {
      byUser.set(row.user_id, { first: val, last: val });
    } else {
      existing.last = val;
    }
  }

  for (const [userId, { first, last }] of byUser) {
    const change = computePeriodChange(last, first);
    if (change != null) result.set(userId, change);
  }
  return result;
}

export interface LeaderboardPageData {
  period: LeaderboardPeriod;
  stats: LeaderboardStats;
  entries: EnrichedLeaderboardEntry[];
  tableEntries: EnrichedLeaderboardEntry[];
  userPosition: UserLeaderboardPosition | null;
  userInTable: boolean;
  highlights: AchievementHighlight[];
  hallOfFame: HallOfFameEntry[];
}

export async function getLeaderboardPageData(
  period: LeaderboardPeriod = "all",
  currentUserId?: string | null
): Promise<LeaderboardPageData> {
  const [rawEntries, previousRanks, traderMeta] = await Promise.all([
    computeAllLiveLeaderboardEntries(),
    getPreviousLeaderboardRankMap(),
    getTraderMetaMap(),
  ]);

  const userIds = rawEntries.map((e) => e.user_id);
  const periodMs = getPeriodMs(period);
  const todayMs = getPeriodMs("today")!;
  const weekMs = getPeriodMs("week")!;

  const [periodChanges, todayChanges, weekChanges] = await Promise.all([
    periodMs ? getPeriodChangeMap(userIds, periodMs) : Promise.resolve(new Map()),
    getPeriodChangeMap(userIds, todayMs),
    getPeriodChangeMap(userIds, weekMs),
  ]);

  const changeMap =
    period === "all" ? todayChanges : periodChanges;

  let enriched = rawEntries.map((entry) => {
    const meta = traderMeta.get(entry.user_id);
    return enrichLeaderboardEntry(entry, {
      periodChangePercent: changeMap.get(entry.user_id) ?? null,
      previousRank: previousRanks.get(entry.user_id) ?? null,
      profileCreatedAt: meta?.created_at,
      holdingsCount: meta?.holdingsCount ?? 0,
    });
  });

  enriched = sortEntriesByPeriod(enriched, period);

  enriched = enriched.map((e) => ({
    ...e,
    badges: assignLeaderboardBadges({
      rank: e.rank,
      totalReturnPercent: e.totalReturnPercent,
      periodChangePercent: e.periodChangePercent,
      holdingsCount: e.holdingsCount,
      profileCreatedAt: e.profileCreatedAt,
    }),
  }));

  const stats = buildLeaderboardStats(
    enriched.map((e) => ({
      ...e,
      periodChangePercent: todayChanges.get(e.user_id) ?? e.periodChangePercent,
    }))
  );

  const tableEntries = enriched.slice(0, 50);
  const userEntry = currentUserId
    ? enriched.find((e) => e.user_id === currentUserId)
    : undefined;

  let userPosition: UserLeaderboardPosition | null = null;
  if (userEntry) {
    const stats = currentUserId
      ? await getUserAchievementStats(currentUserId)
      : { earnedCount: 0, achievementScore: 0 };

    userPosition = {
      rank: userEntry.rank,
      totalValue: userEntry.total_value,
      totalReturnPercent: userEntry.totalReturnPercent,
      changeTodayPercent: todayChanges.get(userEntry.user_id) ?? null,
      username: userEntry.username,
      avatar_style: userEntry.avatar_style,
      rankChange: userEntry.rankChange,
      badges: userEntry.badges,
      achievementsEarned: stats.earnedCount,
      achievementScore: stats.achievementScore,
    };
  }

  const userInTable =
    !!userEntry && userEntry.rank <= 50;

  return {
    period,
    stats,
    entries: enriched.slice(0, 50),
    tableEntries,
    userPosition,
    userInTable,
    highlights: buildAchievementHighlights(
      enriched.map((e) => ({
        ...e,
        periodChangePercent: todayChanges.get(e.user_id) ?? null,
      }))
    ),
    hallOfFame: buildHallOfFame(enriched, weekChanges),
  };
}

export async function getUserPortfolioRank(userId: string): Promise<number | null> {
  if (hasSupabaseAdminCredentials()) {
    const admin = createAdminClient();
    const { data: profiles } = await admin.from("profiles").select("user_id, daq_balance");
    if (!profiles?.length) return null;

    const totals = await Promise.all(
      profiles.map(async (profile) => {
        const { data: holdings } = await admin
          .from("holdings")
          .select("shares, asset:assets(current_price)")
          .eq("user_id", profile.user_id);

        const holdingsValue = computeHoldingsValue(
          (holdings ?? []).map((h) => ({
            shares: h.shares,
            asset: h.asset as unknown as { current_price: number },
          }))
        );

        return {
          user_id: profile.user_id,
          total_value: computeTotalPortfolioValue(profile.daq_balance, holdingsValue),
        };
      })
    );

    totals.sort((a, b) => b.total_value - a.total_value);
    const index = totals.findIndex((t) => t.user_id === userId);
    if (index >= 0) return index + 1;
  }

  const supabase = await createClient();

  const { data: latestSnapshot } = await supabase
    .from("leaderboard_snapshots")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSnapshot) {
    const { data: entry } = await supabase
      .from("leaderboard_snapshots")
      .select("rank")
      .eq("recorded_at", latestSnapshot.recorded_at)
      .eq("user_id", userId)
      .maybeSingle();
    if (entry) return entry.rank;
  }

  return null;
}

export async function getMarketStats() {
  const supabase = await createClient();
  const { count: assetCount } = await supabase
    .from("assets")
    .select("*", { count: "exact", head: true });

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { data: assets } = await supabase
    .from("assets")
    .select("current_price, previous_price, trade_volume_24h");

  const totalVolume = (assets ?? []).reduce(
    (sum, a) => sum + a.trade_volume_24h,
    0
  );

  return {
    totalAssets: assetCount ?? 0,
    totalVolume,
    usersTrading: userCount ?? 0,
  };
}

export async function getPortfolioHistory(
  userId: string,
  limit = 2880
): Promise<{ total_value: number; recorded_at: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_snapshots")
    .select("total_value, recorded_at")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function getAssetsBySlugs(slugs: string[]): Promise<Asset[]> {
  if (slugs.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("assets").select("*").in("slug", slugs);
  const assets = (data ?? []) as Asset[];
  const order = new Map(slugs.map((s, i) => [s, i]));
  return assets.sort(
    (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99)
  );
}

export type RelatedAssetReason =
  | "same_category"
  | "culture_moment"
  | "trending_together";

export interface RelatedAssetEntry {
  asset: Asset;
  reason: RelatedAssetReason;
}

export async function getAssetMarketRank(
  assetId: string
): Promise<{ rank: number; total: number }> {
  const supabase = await createClient();
  const { getAssetRank } = await import("@/lib/asset-ranking");
  return getAssetRank(supabase, assetId);
}

export async function getAssetRankMovementForPage(assetId: string) {
  const supabase = await createClient();
  const { getAssetRankMovement } = await import("@/lib/asset-ranking");
  return getAssetRankMovement(supabase, assetId);
}

export async function getMarketRankMovementsMap() {
  const supabase = await createClient();
  const { getAssetRankMovementsMap } = await import("@/lib/asset-ranking");
  return getAssetRankMovementsMap(supabase);
}

export async function getRelatedAssets(
  asset: Pick<Asset, "id" | "slug" | "category">,
  options?: { cultureSlugs?: string[]; limit?: number }
): Promise<RelatedAssetEntry[]> {
  const limit = options?.limit ?? 6;
  const cultureSlugs = (options?.cultureSlugs ?? []).filter((s) => s !== asset.slug);
  const cultureSlugSet = new Set(cultureSlugs);

  const supabase = await createClient();

  const [{ data: categoryPeers }, { data: trending }] = await Promise.all([
    supabase
      .from("assets")
      .select("*")
      .eq("category", asset.category)
      .neq("id", asset.id)
      .order("trade_volume_24h", { ascending: false })
      .limit(limit),
    supabase
      .from("assets")
      .select("id, slug")
      .neq("id", asset.id)
      .order("trade_volume_24h", { ascending: false })
      .limit(20),
  ]);

  const trendingSlugs = new Set((trending ?? []).map((t) => t.slug));
  const peers = (categoryPeers ?? []) as Asset[];
  const momentPeers =
    cultureSlugs.length > 0 ? await getAssetsBySlugs(cultureSlugs) : [];

  const seen = new Set<string>();
  const merged: RelatedAssetEntry[] = [];

  function add(candidate: Asset, reason: RelatedAssetReason) {
    if (candidate.id === asset.id || seen.has(candidate.id)) return;
    seen.add(candidate.id);
    merged.push({ asset: candidate, reason });
  }

  for (const peer of momentPeers) {
    add(peer, "culture_moment");
    if (merged.length >= limit) return merged;
  }

  for (const peer of peers) {
    const inCultureMoment = cultureSlugSet.has(peer.slug);
    const isTrending = trendingSlugs.has(peer.slug);
    const reason: RelatedAssetReason = inCultureMoment
      ? "culture_moment"
      : isTrending
        ? "trending_together"
        : "same_category";
    add(peer, reason);
    if (merged.length >= limit) return merged;
  }

  return merged;
}

export async function getNewListings(limit = 4): Promise<Asset[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Asset[];
}

export async function getCategoryCounts(): Promise<Record<AssetCategory, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("assets").select("category");
  const counts = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, 0])
  ) as Record<AssetCategory, number>;
  for (const row of data ?? []) {
    const cat = row.category as AssetCategory;
    if (cat in counts) counts[cat]++;
  }
  return counts;
}

export async function getMarketRankMap(): Promise<Map<string, number>> {
  const movements = await getMarketRankMovementsMap();
  const map = new Map<string, number>();
  for (const [assetId, movement] of movements) {
    map.set(assetId, movement.rank);
  }
  return map;
}

export interface MarketInsightCards {
  trending: Asset | null;
  topGainer: Asset | null;
  biggestLoser: Asset | null;
  newListing: Asset | null;
  mostTraded: Asset | null;
}

export async function getMarketInsightCards(): Promise<MarketInsightCards> {
  const [trending, gainers, losers, newest, traded] = await Promise.all([
    getAssets({ sort: "trending", limit: 1 }),
    getAssets({ sort: "gainers", limit: 1 }),
    getAssets({ sort: "losers", limit: 1 }),
    getNewListings(1),
    getAssets({ sort: "most_traded", limit: 1 }),
  ]);
  return {
    trending: trending[0] ?? null,
    topGainer: gainers[0] ?? null,
    biggestLoser: losers[0] ?? null,
    newListing: newest[0] ?? null,
    mostTraded: traded[0] ?? null,
  };
}

export interface CategorySpotlight {
  category: AssetCategory;
  topAsset: Asset | null;
  trending: Asset | null;
  mostTraded: Asset | null;
}

export async function getCategorySpotlight(): Promise<CategorySpotlight> {
  const dayIndex = new Date().getDay() % ALL_CATEGORIES.length;
  const category = ALL_CATEGORIES[dayIndex];

  const [byPrice, trending, traded] = await Promise.all([
    getAssets({ category, sort: "price_desc", limit: 1 }),
    getAssets({ category, sort: "trending", limit: 1 }),
    getAssets({ category, sort: "most_traded", limit: 1 }),
  ]);

  return {
    category,
    topAsset: byPrice[0] ?? null,
    trending: trending[0] ?? null,
    mostTraded: traded[0] ?? null,
  };
}

export interface UserAchievementStats {
  earnedCount: number;
  achievementScore: number;
  totalAchievements: number;
  completionPercent: number;
  latestAchievement: Achievement | null;
  latestUnlockedAt: string | null;
}

async function buildAchievementCardsForUser(
  userId: string,
  options?: { sync?: boolean }
): Promise<{ cards: AchievementCardData[]; totalAchievements: number }> {
  const supabase = await createClient();
  const allAchievements = filterVisibleAchievements(
    await loadAchievementsCatalog(supabase)
  );
  const totalAchievements = allAchievements.length || ACHIEVEMENT_SEED_COUNT;

  if (options?.sync !== false) {
    await checkAndUnlockAchievements(supabase, userId);
  }

  const [ctx, { data: userRows }] = await Promise.all([
    loadAchievementCheckContext(supabase, userId),
    supabase
      .from("user_achievements")
      .select("*, achievement:achievements(id, code)")
      .eq("user_id", userId),
  ]);

  const maps = indexUserAchievements(userRows ?? []);

  const cards = allAchievements.map((achievement) => {
    const row = findUserAchievementRow(achievement, maps);
    const state = resolveAchievementState(achievement, ctx, row);
    return buildAchievementCard(achievement, state);
  });

  return { cards, totalAchievements };
}

export async function getUserAchievementStats(
  userId: string
): Promise<UserAchievementStats> {
  const { cards, totalAchievements } = await buildAchievementCardsForUser(userId);
  return buildStatsFromCards(cards, totalAchievements);
}

export interface AchievementCardData {
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  description: string;
  howToUnlock: string;
  progressDetail: AchievementProgressDetail;
}

export interface CategoryCollectionStat {
  category: AchievementCategory;
  unlocked: number;
  total: number;
}

export interface AchievementsPageData {
  stats: UserAchievementStats;
  cards: AchievementCardData[];
  collections: CategoryCollectionStat[];
  isLoggedIn: boolean;
}

export async function getAchievementsPageData(
  userId?: string | null
): Promise<AchievementsPageData> {
  const supabase = await createClient();
  const allAchievements = filterVisibleAchievements(
    await loadAchievementsCatalog(supabase)
  );

  const emptyStats: UserAchievementStats = {
    earnedCount: 0,
    achievementScore: 0,
    totalAchievements: allAchievements.length,
    completionPercent: 0,
    latestAchievement: null,
    latestUnlockedAt: null,
  };

  function buildCollections(cards: AchievementCardData[]): CategoryCollectionStat[] {
    const map = new Map<AchievementCategory, { unlocked: number; total: number }>();
    for (const card of cards) {
      const cat = card.achievement.category;
      const entry = map.get(cat) ?? { unlocked: 0, total: 0 };
      entry.total += 1;
      if (card.isUnlocked) entry.unlocked += 1;
      map.set(cat, entry);
    }
    return Array.from(map.entries()).map(([category, { unlocked, total }]) => ({
      category,
      unlocked,
      total,
    }));
  }

  if (!userId) {
    const cards = allAchievements.map((achievement) =>
      buildAchievementCard(
        achievement,
        resolveAchievementState(achievement, null, null)
      )
    );
    return {
      stats: emptyStats,
      cards,
      collections: buildCollections(cards),
      isLoggedIn: false,
    };
  }

  const { cards, totalAchievements } = await buildAchievementCardsForUser(userId);
  const stats = buildStatsFromCards(cards, totalAchievements);

  return {
    stats,
    cards,
    collections: buildCollections(cards),
    isLoggedIn: true,
  };
}
