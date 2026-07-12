"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getProfile } from "@/lib/queries";
import { estimatedPriceImpact } from "@/lib/culture-intelligence/discovery";

async function adminContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  const profile = await getProfile(user.id);
  if (!profile?.is_admin) throw new Error("Admin access required");
  return { user, db: createAdminClient() };
}

function refresh() { revalidatePath("/admin/culture-events"); revalidatePath("/admin"); }

export async function approveSuggestion(form: FormData) {
  const { user, db } = await adminContext();
  if (form.get("confirmation") !== "APPROVE_AS_DRAFT") throw new Error("Approval confirmation required");
  const edits = { title: String(form.get("title") ?? "").trim(), summary: String(form.get("summary") ?? "").trim() };
  const { error } = await db.rpc("approve_culture_event_suggestion", { p_suggestion_id: String(form.get("id")), p_actor: user.id, p_edits: edits });
  if (error) throw error;
  refresh();
}

export async function editSuggestion(form: FormData) {
  const { user, db } = await adminContext();
  const id = String(form.get("id"));
  const { data: before } = await db.from("culture_event_suggestions").select("*").eq("id", id).eq("status", "pending").single();
  const slugs = form.getAll("affected_assets").map(String);
  const { data: assetRows, error: assetError } = await db.from("assets").select("id,slug,name").in("slug", slugs);
  if (assetError) throw assetError;
  if (!assetRows?.length) throw new Error("Select at least one affected asset");
  const affected_assets = assetRows.map((asset) => ({ assetId: asset.id, slug: asset.slug, name: asset.name }));
  const candidate = {
    confidence: Number(form.get("confidence")), sentiment: String(form.get("sentiment")) as "positive" | "neutral" | "negative" | "mixed",
    expectedAttention: Number(form.get("expected_attention")), predictedAttention: Number(form.get("predicted_attention")), reach: Number(form.get("reach")),
  };
  const patch = { title: String(form.get("title") ?? "").trim(), summary: String(form.get("summary") ?? "").trim(),
    event_type: String(form.get("event_type")), affected_assets, confidence: candidate.confidence, sentiment: candidate.sentiment,
    expected_attention: candidate.expectedAttention, predicted_attention: candidate.predictedAttention, reach: candidate.reach,
    time_to_peak_hours: Number(form.get("time_to_peak_hours")), decay_rate: Number(form.get("decay_rate")),
    estimated_price_impact_percent: estimatedPriceImpact(candidate), updated_at: new Date().toISOString() };
  const { data: after, error } = await db.from("culture_event_suggestions").update(patch).eq("id", id).eq("status", "pending").select("*").single();
  if (error) throw error;
  await db.from("culture_suggestion_audit_log").insert({ suggestion_id: id, action: "edited", actor_type: "admin", actor_id: user.id, before_state: before, after_state: after });
  refresh();
}

export async function rejectSuggestion(form: FormData) {
  const { user, db } = await adminContext();
  if (form.get("confirmation") !== "REJECT_SUGGESTION") throw new Error("Rejection confirmation required");
  const id = String(form.get("id"));
  const { data: before } = await db.from("culture_event_suggestions").select("*").eq("id", id).eq("status", "pending").single();
  const { data: after, error } = await db.from("culture_event_suggestions").update({ status: "rejected", rejection_reason: String(form.get("reason") ?? "Not suitable"), reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending").select("*").single();
  if (error) throw error;
  await db.from("culture_suggestion_audit_log").insert({ suggestion_id: id, action: "rejected", actor_type: "admin", actor_id: user.id, before_state: before, after_state: after });
  refresh();
}

export async function mergeSuggestion(form: FormData) {
  const { user, db } = await adminContext();
  if (form.get("confirmation") !== "MERGE_SUGGESTION") throw new Error("Merge confirmation required");
  const id = String(form.get("id")), targetId = String(form.get("target_id"));
  if (!targetId || id === targetId) throw new Error("Choose a different target suggestion");
  const { data: before } = await db.from("culture_event_suggestions").select("*").eq("id", id).eq("status", "pending").single();
  const { data: target } = await db.from("culture_event_suggestions").select("id,source_links").eq("id", targetId).in("status", ["pending", "approved"]).single();
  if (!target) throw new Error("Merge target not available");
  const combined = [...(target.source_links ?? []), ...(before.source_links ?? [])].filter((link, index, links) => links.findIndex((item) => item.url === link.url) === index);
  await db.from("culture_event_suggestions").update({ source_links: combined, updated_at: new Date().toISOString() }).eq("id", targetId);
  const { data: after, error } = await db.from("culture_event_suggestions").update({ status: "merged", merged_into_id: targetId, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending").select("*").single();
  if (error) throw error;
  await db.from("culture_suggestion_audit_log").insert({ suggestion_id: id, action: "merged", actor_type: "admin", actor_id: user.id, before_state: before, after_state: after, metadata: { target_id: targetId } });
  refresh();
}
