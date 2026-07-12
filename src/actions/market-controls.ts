"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getProfile } from "@/lib/queries";

async function requireAdmin() { const user=await getCurrentUser(); if(!user) throw new Error("Unauthorized"); const profile=await getProfile(user.id); if(!profile?.is_admin) throw new Error("Admin required"); return createAdminClient(); }
export async function setMarketPaused(form: FormData) {
  const admin=await requireAdmin(); const paused=form.get("paused")==="true";
  const expected=paused?"PAUSE_MARKET_V2":"RESUME_MARKET_V2";
  if(form.get("confirmation")!==expected) throw new Error("Invalid confirmation");
  const now=new Date().toISOString();
  const {error}=await admin.from("market_engine_controls").update({paused,pause_reason:paused?"Paused manually by administrator":null,paused_at:paused?now:null,resumed_at:paused?null:now,updated_at:now}).eq("id","production");
  if(error) throw error; revalidatePath("/admin"); revalidatePath("/admin/market-controls");
}
