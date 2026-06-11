import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Asset,
  AssetRank,
  AssetRankHistory,
  AssetRankMovement,
  RankSnapshot,
} from "@/types/database";

type RankableAsset = Pick<Asset, "id" | "current_price">;

function toNumber(value: unknown): number {
  return Number(value);
}

/** Rank assets by current_price descending. Highest price = #1. */
export function calculateAssetRanks(assets: RankableAsset[]): AssetRank[] {
  const sorted = [...assets].sort((a, b) => {
    const priceDiff = toNumber(b.current_price) - toNumber(a.current_price);
    if (priceDiff !== 0) return priceDiff;
    return a.id.localeCompare(b.id);
  });

  return sorted.map((asset, index) => {
    const price = toNumber(asset.current_price);
    return {
      assetId: asset.id,
      rank: index + 1,
      price,
      portfolioValueBasis: price,
    };
  });
}

export function buildAssetRankMap(assets: RankableAsset[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of calculateAssetRanks(assets)) {
    map.set(entry.assetId, entry.rank);
  }
  return map;
}

function rowToSnapshot(row: AssetRankHistory): RankSnapshot {
  return {
    assetId: row.asset_id,
    rank: row.rank,
    previousRank: row.previous_rank,
    rankChange: row.rank_change,
    portfolioValueBasis: toNumber(row.portfolio_value_basis),
    price: toNumber(row.price),
    recordedAt: row.recorded_at,
  };
}

function movementFromSnapshot(latest: RankSnapshot): AssetRankMovement {
  return {
    assetId: latest.assetId,
    rank: latest.rank,
    previousRank: latest.previousRank,
    rankChange: latest.rankChange,
    price: latest.price,
    recordedAt: latest.recordedAt,
    isNewlyRanked: latest.previousRank == null,
  };
}

async function fetchLatestSnapshotsByAsset(
  supabase: SupabaseClient
): Promise<Map<string, RankSnapshot>> {
  const { data, error } = await supabase
    .from("asset_rank_history")
    .select("*")
    .order("recorded_at", { ascending: false });

  if (error || !data) return new Map();

  const map = new Map<string, RankSnapshot>();
  for (const row of data as AssetRankHistory[]) {
    if (!map.has(row.asset_id)) {
      map.set(row.asset_id, rowToSnapshot(row));
    }
  }
  return map;
}

export async function getAssetRank(
  supabase: SupabaseClient,
  assetId: string,
  assets?: RankableAsset[]
): Promise<{ rank: number; total: number }> {
  const latest = await fetchLatestSnapshotsByAsset(supabase);
  const snapshot = latest.get(assetId);
  const { count } = await supabase
    .from("assets")
    .select("*", { count: "exact", head: true });
  const total = count ?? latest.size;

  if (snapshot) {
    return { rank: snapshot.rank, total };
  }

  const pool =
    assets ??
    ((await supabase.from("assets").select("id, current_price")).data ?? []);
  const ranks = calculateAssetRanks(pool as RankableAsset[]);
  const entry = ranks.find((r) => r.assetId === assetId);
  return {
    rank: entry?.rank ?? ranks.length,
    total: ranks.length,
  };
}

export async function getAssetRankMovement(
  supabase: SupabaseClient,
  assetId: string,
  assets?: RankableAsset[]
): Promise<AssetRankMovement> {
  const latestByAsset = await fetchLatestSnapshotsByAsset(supabase);
  const latest = latestByAsset.get(assetId) ?? null;

  if (latest) {
    return movementFromSnapshot(latest);
  }

  const pool =
    assets ??
    ((await supabase.from("assets").select("id, current_price")).data ?? []);
  const ranks = calculateAssetRanks(pool as RankableAsset[]);
  const entry = ranks.find((r) => r.assetId === assetId);
  return {
    assetId,
    rank: entry?.rank ?? pool.length,
    previousRank: null,
    rankChange: null,
    price: entry?.price ?? 0,
    recordedAt: null,
    isNewlyRanked: true,
  };
}

export async function getAssetRankMovementsMap(
  supabase: SupabaseClient,
  assets?: RankableAsset[]
): Promise<Map<string, AssetRankMovement>> {
  const latestByAsset = await fetchLatestSnapshotsByAsset(supabase);

  const pool =
    assets ??
    ((await supabase.from("assets").select("id, current_price")).data ?? []);
  const liveRanks = calculateAssetRanks(pool as RankableAsset[]);
  const map = new Map<string, AssetRankMovement>();

  if (latestByAsset.size > 0) {
    for (const [assetId, latest] of latestByAsset) {
      map.set(assetId, movementFromSnapshot(latest));
    }
    for (const entry of liveRanks) {
      if (!map.has(entry.assetId)) {
        map.set(entry.assetId, {
          assetId: entry.assetId,
          rank: entry.rank,
          previousRank: null,
          rankChange: null,
          price: entry.price,
          recordedAt: null,
          isNewlyRanked: true,
        });
      }
    }
    return map;
  }

  for (const entry of liveRanks) {
    map.set(entry.assetId, {
      assetId: entry.assetId,
      rank: entry.rank,
      previousRank: null,
      rankChange: null,
      price: entry.price,
      recordedAt: null,
      isNewlyRanked: true,
    });
  }
  return map;
}

export async function recordAssetRankSnapshot(
  supabase: SupabaseClient,
  assets: RankableAsset[],
  recordedAt?: string
): Promise<{ recorded: number; skipped: number }> {
  if (assets.length === 0) return { recorded: 0, skipped: 0 };

  const timestamp = recordedAt ?? new Date().toISOString();
  const ranks = calculateAssetRanks(assets);
  const latestByAsset = await fetchLatestSnapshotsByAsset(supabase);

  const rows: Array<{
    asset_id: string;
    rank: number;
    previous_rank: number | null;
    rank_change: number | null;
    portfolio_value_basis: number;
    price: number;
    recorded_at: string;
  }> = [];

  let skipped = 0;

  for (const entry of ranks) {
    const previous = latestByAsset.get(entry.assetId);
    const previousRank = previous?.rank ?? null;
    const rankChange = previousRank != null ? previousRank - entry.rank : null;

    if (previous && previous.rank === entry.rank && previous.price === entry.price) {
      skipped++;
      continue;
    }

    rows.push({
      asset_id: entry.assetId,
      rank: entry.rank,
      previous_rank: previousRank,
      rank_change: rankChange,
      portfolio_value_basis: entry.portfolioValueBasis,
      price: entry.price,
      recorded_at: timestamp,
    });
  }

  if (rows.length === 0) return { recorded: 0, skipped };

  const { error } = await supabase.from("asset_rank_history").insert(rows);
  if (error) throw new Error(error.message);

  return { recorded: rows.length, skipped };
}

export async function backfillAssetRanks(
  supabase: SupabaseClient
): Promise<{ recorded: number }> {
  const { data: assets, error } = await supabase
    .from("assets")
    .select("id, current_price");

  if (error) throw new Error(error.message);
  const result = await recordAssetRankSnapshot(
    supabase,
    (assets ?? []) as RankableAsset[]
  );
  return { recorded: result.recorded };
}

// --- Achievement prep helpers ---

export async function getAssetBestHistoricalRank(
  supabase: SupabaseClient,
  assetId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("asset_rank_history")
    .select("rank")
    .eq("asset_id", assetId)
    .order("rank", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.rank;
}

export async function getAssetRankAtTime(
  supabase: SupabaseClient,
  assetId: string,
  timestamp: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("asset_rank_history")
    .select("rank, recorded_at")
    .eq("asset_id", assetId)
    .lte("recorded_at", timestamp)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.rank;
}

/**
 * Whether the user held the asset before it first reached targetRank (inclusive).
 * Used for Trend Spotter, Talent Scout, Cultural Oracle, Kingmaker checks.
 */
export async function didUserOwnAssetBeforeRank(
  supabase: SupabaseClient,
  userId: string,
  assetId: string,
  targetRank: number
): Promise<boolean> {
  const { data: history, error } = await supabase
    .from("asset_rank_history")
    .select("rank, recorded_at")
    .eq("asset_id", assetId)
    .lte("rank", targetRank)
    .order("recorded_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !history) return false;

  const firstReachedAt = history.recorded_at;

  const [{ data: holdings }, { data: trades }] = await Promise.all([
    supabase
      .from("holdings")
      .select("created_at, shares")
      .eq("user_id", userId)
      .eq("asset_id", assetId)
      .gt("shares", 0)
      .lte("created_at", firstReachedAt)
      .limit(1),
    supabase
      .from("trades")
      .select("created_at")
      .eq("user_id", userId)
      .eq("asset_id", assetId)
      .eq("trade_type", "buy")
      .lte("created_at", firstReachedAt)
      .limit(1),
  ]);

  return (holdings?.length ?? 0) > 0 || (trades?.length ?? 0) > 0;
}

export { formatRankMovementBullet, isSignificantRankMovement } from "@/lib/rank-significance";
