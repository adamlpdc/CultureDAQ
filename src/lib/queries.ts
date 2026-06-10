import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
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
    query = query.ilike("name", `%${options.search}%`);
  }

  const sort = options?.sort ?? "trending";
  switch (sort) {
    case "price_desc":
      query = query.order("current_price", { ascending: false });
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
    .eq("slug", slug)
    .single();
  return data;
}

export async function getAssetPriceHistory(
  assetId: string,
  limit = 96
): Promise<{ price: number; recorded_at: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("asset_prices")
    .select("price, recorded_at")
    .eq("asset_id", assetId)
    .order("recorded_at", { ascending: true })
    .limit(limit);
  return data ?? [];
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
  const holdingsValue = holdings.reduce(
    (sum, h) => sum + h.shares * h.asset.current_price,
    0
  );

  const { data: snapshots } = await supabase
    .from("portfolio_snapshots")
    .select("total_value")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(2);

  let dayChangePercent: number | null = null;
  if (snapshots && snapshots.length >= 2) {
    const current = profile.daq_balance + holdingsValue;
    const previous = snapshots[1].total_value;
    if (previous > 0) {
      dayChangePercent = ((current - previous) / previous) * 100;
    }
  }

  return {
    daq_balance: profile.daq_balance,
    holdings_value: holdingsValue,
    total_value: profile.daq_balance + holdingsValue,
    holdings_count: holdings.length,
    day_change_percent: dayChangePercent,
  };
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  const { data: latestSnapshot } = await supabase
    .from("leaderboard_snapshots")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSnapshot) {
    const { data } = await supabase
      .from("leaderboard_snapshots")
      .select("*")
      .eq("recorded_at", latestSnapshot.recorded_at)
      .order("rank", { ascending: true })
      .limit(limit);
    if (data && data.length > 0) return data;
  }

  return computeLiveLeaderboard(limit);
}

async function computeLiveLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("*");

  if (!profiles) return [];

  const entries = await Promise.all(
    profiles.map(async (profile) => {
      const { data: holdings } = await admin
        .from("holdings")
        .select("shares, asset:assets(current_price)")
        .eq("user_id", profile.user_id);

      const holdingsValue = (holdings ?? []).reduce((sum, h) => {
        const asset = h.asset as unknown as { current_price: number } | null;
        return sum + h.shares * (asset?.current_price ?? 0);
      }, 0);

      return {
        id: profile.id,
        user_id: profile.user_id,
        username: profile.username,
        total_value: profile.daq_balance + holdingsValue,
        rank: 0,
        recorded_at: new Date().toISOString(),
      };
    })
  );

  return entries
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, limit)
    .map((e, i) => ({ ...e, rank: i + 1 }));
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
  limit = 48
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

export async function getNewListings(limit = 4): Promise<Asset[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Asset[];
}
