"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_PRESETS } from "@/lib/avatars";

export type ProfileActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be 20 characters or less")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

const avatarSchema = z.enum(
  AVATAR_PRESETS.map((p) => p.id) as [string, ...string[]]
);

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateProfile() {
  revalidatePath("/profile");
  revalidatePath("/", "layout");
}

export async function updateUsername(
  _prev: ProfileActionResult | undefined,
  formData: FormData
): Promise<ProfileActionResult> {
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid username" };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sign in required" };

  const username = parsed.data.toLowerCase();

  const { data: existing } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .neq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Username is already taken" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username, display_name: username })
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidateProfile();
  return { success: true, message: "Username updated" };
}

export async function updateAvatarStyle(avatarStyle: string): Promise<ProfileActionResult> {
  const parsed = avatarSchema.safeParse(avatarStyle);
  if (!parsed.success) return { success: false, error: "Invalid avatar style" };

  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sign in required" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_style: parsed.data })
    .eq("user_id", user.id);

  if (error) {
    if (error.message.includes("avatar_style")) {
      return { success: false, error: "Avatar styles not available yet — run profile migration" };
    }
    return { success: false, error: error.message };
  }

  revalidateProfile();
  return { success: true, message: "Avatar updated" };
}

export async function updateFavoriteAchievement(
  achievementId: string
): Promise<ProfileActionResult> {
  const idParsed = z.string().uuid().safeParse(achievementId);
  if (!idParsed.success) return { success: false, error: "Invalid achievement" };

  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sign in required" };

  const { data: owned } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("user_id", user.id)
    .eq("achievement_id", idParsed.data)
    .eq("is_unlocked", true)
    .maybeSingle();

  if (!owned) {
    return { success: false, error: "You can only favorite unlocked achievements" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ favorite_achievement_id: idParsed.data })
    .eq("user_id", user.id);

  if (error) {
    if (error.message.includes("favorite_achievement_id")) {
      return { success: false, error: "Favorite achievement not available yet — run profile migration" };
    }
    return { success: false, error: error.message };
  }

  revalidateProfile();
  return { success: true, message: "Favorite achievement updated" };
}

export async function updatePassword(
  _prev: ProfileActionResult | undefined,
  formData: FormData
): Promise<ProfileActionResult> {
  const password = formData.get("password");
  const confirm = formData.get("confirmPassword");

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid password" };
  }

  if (parsed.data !== confirm) {
    return { success: false, error: "Passwords do not match" };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sign in required" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { success: false, error: error.message };

  return { success: true, message: "Password updated" };
}
