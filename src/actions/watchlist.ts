"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const assetIdSchema = z.string().uuid();

export type WatchlistActionResult =
  | { success: true; watched: boolean; message: string }
  | { success: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null as null };
  }
  return { supabase, user };
}

export async function addToWatchlist(assetId: string): Promise<WatchlistActionResult> {
  const parsed = assetIdSchema.safeParse(assetId);
  if (!parsed.success) {
    return { success: false, error: "Invalid asset" };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { success: false, error: "Sign in to watch assets" };
  }

  const { data: existing } = await supabase
    .from("watchlist_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("asset_id", parsed.data)
    .maybeSingle();

  if (existing) {
    return { success: true, watched: true, message: "Already on your watchlist" };
  }

  const { error } = await supabase.from("watchlist_items").insert({
    user_id: user.id,
    asset_id: parsed.data,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: true, watched: true, message: "Already on your watchlist" };
    }
    return { success: false, error: error.message };
  }

  revalidateWatchlistPaths();
  return { success: true, watched: true, message: "Added to watchlist" };
}

export async function removeFromWatchlist(
  assetId: string
): Promise<WatchlistActionResult> {
  const parsed = assetIdSchema.safeParse(assetId);
  if (!parsed.success) {
    return { success: false, error: "Invalid asset" };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { success: false, error: "Sign in to manage your watchlist" };
  }

  const { error } = await supabase
    .from("watchlist_items")
    .delete()
    .eq("user_id", user.id)
    .eq("asset_id", parsed.data);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateWatchlistPaths();
  return { success: true, watched: false, message: "Removed from watchlist" };
}

export async function toggleWatchlist(
  assetId: string,
  currentlyWatched: boolean
): Promise<WatchlistActionResult> {
  if (currentlyWatched) {
    return removeFromWatchlist(assetId);
  }
  return addToWatchlist(assetId);
}

function revalidateWatchlistPaths() {
  revalidatePath("/portfolio");
  revalidatePath("/watchlist");
  revalidatePath("/market");
  revalidatePath("/asset");
}
