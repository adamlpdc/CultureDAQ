import { redirect } from "next/navigation";
import { WatchlistPageContent } from "@/components/watchlist/watchlist-page-content";
import { getAssetsBySlugs, getCurrentUser } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  computeWatchlistAnalytics,
  getUserWatchlist,
  getUserWatchlistAssetIds,
} from "@/lib/watchlist";
import type { AssetRankMovement } from "@/types/database";
import { getAssetRankMovementsMap } from "@/lib/asset-ranking";

const POPULAR_WATCH_SLUGS = ["taylor-swift", "nike", "liverpool-fc"] as const;

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/watchlist");

  const supabase = await createClient();
  const [items, suggestedAssets] = await Promise.all([
    getUserWatchlist(supabase, user.id),
    getAssetsBySlugs([...POPULAR_WATCH_SLUGS]),
  ]);

  const rankMovementsMap = await getAssetRankMovementsMap(
    supabase,
    items.length > 0
      ? items.map((i) => ({ id: i.asset_id, current_price: i.asset.current_price }))
      : suggestedAssets.map((a) => ({ id: a.id, current_price: a.current_price }))
  );
  const analytics = computeWatchlistAnalytics(items, rankMovementsMap);

  const rankMovements: Record<string, AssetRankMovement> = {};
  for (const [id, movement] of rankMovementsMap) {
    rankMovements[id] = movement;
  }

  const watchedIds =
    items.length > 0
      ? items.map((i) => i.asset_id)
      : [...(await getUserWatchlistAssetIds(supabase, user.id))];

  return (
    <WatchlistPageContent
      items={items}
      analytics={analytics}
      rankMovements={rankMovements}
      suggestedAssets={suggestedAssets}
      watchedAssetIds={watchedIds}
      isLoggedIn
    />
  );
}
