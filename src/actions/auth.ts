"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const EMAIL_CONFIRMATION_MESSAGE =
  "Check your email to verify your account. Once verified, you can log in to CultureDAQ.";

export type SignUpResult =
  | { error: string }
  | { success: true; needsEmailConfirmation: true; message: string; email: string };

export async function signUp(
  _prevState: SignUpResult | undefined,
  formData: FormData
): Promise<SignUpResult> {
  const supabase = await createClient();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const username = (formData.get("username") as string)?.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${getAppUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Supabase returns an obfuscated user with no identities when the email already exists.
  if (data.user?.identities?.length === 0) {
    return {
      success: true,
      needsEmailConfirmation: true,
      message: EMAIL_CONFIRMATION_MESSAGE,
      email,
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    success: true,
    needsEmailConfirmation: true,
    message: EMAIL_CONFIRMATION_MESSAGE,
    email,
  };
}

export async function signIn(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Please verify your email before signing in. Check your inbox for the confirmation link.",
      };
    }
    return { error: error.message };
  }

  const redirectTo = (formData.get("redirect") as string) || "/";
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
