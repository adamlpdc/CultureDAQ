import { createAdminClient, hasSupabaseAdminCredentials } from "@/lib/supabase/admin";

export function mapAuthError(message: string, code?: string): string {
  const lower = message.toLowerCase();
  if (
    code === "over_email_send_rate_limit" ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    return "Please wait a few minutes before requesting another verification email.";
  }
  if (lower.includes("error sending confirmation email") || lower.includes("email sending failed")) {
    return "We couldn't send the email right now. Please try again in a few minutes.";
  }
  return message;
}

/** Server-only lookup for signup duplicate handling (private alpha). */
export async function findAuthUserByEmail(email: string) {
  if (!hasSupabaseAdminCredentials()) return null;

  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  for (let i = 0; i < 10; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) break;

    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match;

    if (data.users.length < perPage) break;
    page++;
  }

  return null;
}
