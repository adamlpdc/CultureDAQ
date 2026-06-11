"use server";

import { revalidatePath } from "next/cache";
import { backfillAssetRanks, getAssetRankMovementsMap } from "@/lib/asset-ranking";
import { generateAssetEvents } from "@/lib/market-events";
import type { Asset } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Admin access required");
  return user;
}

export async function toggleAssetFeatured(assetId: string, featured: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("assets").update({ featured }).eq("id", assetId);
  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath("/admin");
}

export async function toggleAssetTrading(
  assetId: string,
  tradingPaused: boolean
) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("assets").update({ trading_paused: tradingPaused }).eq("id", assetId);
  revalidatePath("/market");
  revalidatePath("/admin");
}

export async function updateAssetPrice(assetId: string, newPrice: number) {
  await requireAdmin();
  if (newPrice <= 0) throw new Error("Price must be positive");

  const admin = createAdminClient();
  const { data: asset } = await admin
    .from("assets")
    .select("current_price")
    .eq("id", assetId)
    .single();

  if (!asset) throw new Error("Asset not found");

  const oldPrice = asset.current_price;
  const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

  await admin
    .from("assets")
    .update({ previous_price: oldPrice, current_price: newPrice })
    .eq("id", assetId);

  await admin.from("asset_prices").insert({
    asset_id: assetId,
    price: newPrice,
  });

  await admin.from("price_events").insert({
    asset_id: assetId,
    old_price: oldPrice,
    new_price: newPrice,
    change_percent: changePercent,
    reason: "Admin manually adjusted the price.",
    source: "admin",
  });

  revalidatePath("/market");
  revalidatePath("/admin");
}

export async function backfillCurrentAssetRanks(): Promise<{
  recorded: number;
}> {
  await requireAdmin();
  const admin = createAdminClient();
  const result = await backfillAssetRanks(admin);
  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath("/admin");
  return result;
}

export async function generateCurrentMarketEvents(): Promise<{
  generated: number;
  skipped: number;
}> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: assets } = await admin.from("assets").select("*");
  const rankMovements = await getAssetRankMovementsMap(
    admin,
    (assets ?? []) as Asset[]
  );
  const result = await generateAssetEvents(admin, {
    assets: (assets ?? []) as Asset[],
    rankMovements,
  });
  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath("/admin");
  revalidatePath("/asset");
  return result;
}
