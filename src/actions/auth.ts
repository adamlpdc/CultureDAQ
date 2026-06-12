"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findAuthUserByEmail, mapAuthError } from "@/lib/auth-users";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const EMAIL_CONFIRMATION_MESSAGE =
  "Check your email to verify your account. Once verified, you can log in to CultureDAQ.";

const RESEND_SUCCESS_MESSAGE =
  "We've sent a new verification email. Please check your inbox.";

export type SignUpResult =
  | { error: string }
  | { status: "new_user"; email: string; message: string }
  | { status: "existing_confirmed"; email: string }
  | { status: "existing_unconfirmed"; email: string };

export type ResendConfirmationResult =
  | { error: string }
  | { success: true; email: string; message: string };

function emailRedirectTo() {
  return `${getAppUrl()}/auth/callback`;
}

async function resolveDuplicateEmail(email: string): Promise<SignUpResult> {
  const existing = await findAuthUserByEmail(email);

  if (existing?.email_confirmed_at) {
    return { status: "existing_confirmed", email };
  }

  if (existing) {
    return { status: "existing_unconfirmed", email };
  }

  // Supabase obfuscated duplicate with no admin match — stay vague.
  return {
    status: "new_user",
    email,
    message: EMAIL_CONFIRMATION_MESSAGE,
  };
}

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
      emailRedirectTo: emailRedirectTo(),
    },
  });

  if (error) {
    return { error: mapAuthError(error.message, error.code) };
  }

  if (data.user?.identities?.length === 0) {
    return resolveDuplicateEmail(email);
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    status: "new_user",
    email,
    message: EMAIL_CONFIRMATION_MESSAGE,
  };
}

export async function resendSignupConfirmation(
  _prevState: ResendConfirmationResult | undefined,
  formData: FormData
): Promise<ResendConfirmationResult> {
  const email = (formData.get("email") as string)?.trim();
  if (!email) {
    return { error: "Email is required." };
  }

  const existing = await findAuthUserByEmail(email);
  if (existing?.email_confirmed_at) {
    return { error: "This email is already verified. Please sign in instead." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: emailRedirectTo() },
  });

  if (error) {
    return { error: mapAuthError(error.message, error.code) };
  }

  return { success: true, email, message: RESEND_SUCCESS_MESSAGE };
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
