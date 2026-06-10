"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const tradeSchema = z.object({
  assetId: z.string().uuid(),
  shares: z.coerce.number().int().positive().max(1_000_000),
});

export type TradeResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function buyShares(
  assetId: string,
  shares: number
): Promise<TradeResult> {
  const parsed = tradeSchema.safeParse({ assetId, shares });
  if (!parsed.success) {
    return { success: false, error: "Invalid trade parameters" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to trade" };
  }

  const { data, error } = await supabase.rpc("buy_shares", {
    p_user_id: user.id,
    p_asset_id: parsed.data.assetId,
    p_shares: parsed.data.shares,
  });

  if (error) {
    const message = error.message.includes("Insufficient DAQ")
      ? "Insufficient DAQ balance"
      : error.message.includes("Trading is paused")
        ? "Trading is paused for this asset"
        : error.message;
    return { success: false, error: message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/market");
  revalidatePath(`/asset`);

  return {
    success: true,
    message: `Bought ${parsed.data.shares} shares for ${data?.total_cost ?? ""} DAQ`,
  };
}

export async function sellShares(
  assetId: string,
  shares: number
): Promise<TradeResult> {
  const parsed = tradeSchema.safeParse({ assetId, shares });
  if (!parsed.success) {
    return { success: false, error: "Invalid trade parameters" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to trade" };
  }

  const { data, error } = await supabase.rpc("sell_shares", {
    p_user_id: user.id,
    p_asset_id: parsed.data.assetId,
    p_shares: parsed.data.shares,
  });

  if (error) {
    const message = error.message.includes("Insufficient shares")
      ? "You don't own enough shares"
      : error.message.includes("Trading is paused")
        ? "Trading is paused for this asset"
        : error.message;
    return { success: false, error: message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/market");
  revalidatePath(`/asset`);

  return {
    success: true,
    message: `Sold ${parsed.data.shares} shares for ${data?.total_proceeds ?? ""} DAQ`,
  };
}
