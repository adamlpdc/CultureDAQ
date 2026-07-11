"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getProfile } from "@/lib/queries";

async function adminContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  const profile = await getProfile(user.id);
  if (!profile?.is_admin) throw new Error("Admin access required");
  return { user, supabase: createAdminClient() };
}

const num = (form: FormData, key: string) => Number(form.get(key));

async function affectedAssets(form: FormData) {
  const slugs = form.getAll("affected_assets").map(String);
  const { supabase } = await adminContext();
  const { data, error } = await supabase.from("assets").select("id,slug,name").in("slug", slugs);
  if (error) throw error;
  if (!data?.length) throw new Error("Select at least one affected asset");
  return data.map((asset) => ({ assetId: asset.id, slug: asset.slug, name: asset.name }));
}

export async function createCultureEvent(form: FormData) {
  const { user, supabase } = await adminContext();
  const assets = await affectedAssets(form);
  const actualRaw = String(form.get("actual_attention") ?? "").trim();
  const actual = actualRaw ? Number(actualRaw) : null;
  const expected = num(form, "expected_attention");
  const row = {
    title: String(form.get("title") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
    source: String(form.get("source") ?? "manual_admin").trim(),
    source_url: String(form.get("source_url") ?? "").trim() || null,
    event_type: String(form.get("event_type")),
    affected_assets: assets,
    confidence: num(form, "confidence") / 100,
    sentiment: String(form.get("sentiment")),
    expected_attention: expected,
    predicted_attention: expected,
    actual_attention: actual,
    surprise_delta: actual == null ? null : actual - expected / 20,
    reach: num(form, "reach"),
    time_to_peak_hours: num(form, "time_to_peak"),
    decay_rate: num(form, "decay_rate"),
    is_verified: false,
    status: "draft",
    created_by: user.id,
  };
  const { data, error } = await supabase.from("culture_events").insert(row).select("*").single();
  if (error) throw error;
  await supabase.from("culture_event_audit_log").insert({ culture_event_id: data.id, action: "created", actor_id: user.id, after_state: data });
  revalidatePath("/admin/culture-events");
}

export async function editCultureEvent(form: FormData) {
  const { user, supabase } = await adminContext();
  const id = String(form.get("id"));
  const { data: before } = await supabase.from("culture_events").select("*").eq("id", id).single();
  if (before?.is_verified) throw new Error("Rollback verification before editing this event");
  const assets = await affectedAssets(form);
  const patch = {
    title: String(form.get("title") ?? "").trim(), description: String(form.get("description") ?? "").trim(),
    source: String(form.get("source") ?? "manual_admin").trim(), source_url: String(form.get("source_url") ?? "").trim() || null,
    event_type: String(form.get("event_type")), affected_assets: assets,
    confidence: num(form, "confidence") / 100, sentiment: String(form.get("sentiment")),
    expected_attention: num(form, "expected_attention"), predicted_attention: num(form, "expected_attention"),
    reach: num(form, "reach"), time_to_peak_hours: num(form, "time_to_peak"), decay_rate: num(form, "decay_rate"),
  };
  const { data: after, error } = await supabase.from("culture_events").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  await supabase.from("culture_event_audit_log").insert({ culture_event_id: id, action: "edited", actor_id: user.id, before_state: before, after_state: after });
  revalidatePath("/admin/culture-events");
}

export async function verifyCultureEvent(form: FormData) {
  const { user, supabase } = await adminContext();
  if (form.get("confirmation") !== "CONFIRM_VERIFIED_EVENT_PRICING") throw new Error("Explicit pricing confirmation required");
  const id = String(form.get("id"));
  const { data: before } = await supabase.from("culture_events").select("*").eq("id", id).single();
  const actualRaw = String(form.get("actual_attention") ?? "").trim();
  const actual = actualRaw ? Number(actualRaw) : before.actual_attention;
  const { data: after, error } = await supabase.from("culture_events").update({ is_verified: true, verified_at: new Date().toISOString(), verification_confirmation: "CONFIRM_VERIFIED_EVENT_PRICING", status: "verified", actual_attention: actual, surprise_delta: actual == null ? null : Number(actual) - Number(before.expected_attention) / 20 }).eq("id", id).eq("is_verified", false).select("*").single();
  if (error) throw error;
  await supabase.from("culture_event_audit_log").insert({ culture_event_id: id, action: "verified", actor_id: user.id, before_state: before, after_state: after });
  revalidatePath("/admin/culture-events");
}

export async function resolveCultureEventAction(form: FormData) {
  const { user, supabase } = await adminContext();
  const id = String(form.get("id"));
  const actual = num(form, "actual_attention");
  const { data: before } = await supabase.from("culture_events").select("*").eq("id", id).single();
  const surprise = actual - Number(before.expected_attention) / 20;
  const { data: after, error } = await supabase.from("culture_events").update({ actual_attention: actual, surprise_delta: surprise, resolved_at: new Date().toISOString(), status: "resolved" }).eq("id", id).select("*").single();
  if (error) throw error;
  await supabase.from("culture_event_audit_log").insert({ culture_event_id: id, action: "resolved", actor_id: user.id, before_state: before, after_state: after });
  revalidatePath("/admin/culture-events");
}

export async function cancelCultureEvent(form: FormData) {
  const { user, supabase } = await adminContext();
  const id = String(form.get("id"));
  const { data: before } = await supabase.from("culture_events").select("*").eq("id", id).single();
  const { data: after, error } = await supabase.from("culture_events").update({ status: "cancelled", cancelled_at: new Date().toISOString(), resolved_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) throw error;
  await supabase.from("culture_event_audit_log").insert({ culture_event_id: id, action: "cancelled", actor_id: user.id, before_state: before, after_state: after });
  revalidatePath("/admin/culture-events");
}

export async function rollbackCultureEvent(form: FormData) {
  const { user, supabase } = await adminContext();
  const { error } = await supabase.rpc("rollback_culture_event_v1", { p_event_id: String(form.get("id")), p_actor: user.id });
  if (error) throw error;
  revalidatePath("/admin/culture-events");
}
