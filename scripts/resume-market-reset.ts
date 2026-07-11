import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase admin credentials");
if (process.env.FEATURE_MARKET_REBALANCE !== "true") {
  throw new Error("FEATURE_MARKET_REBALANCE must remain true through validation and resume");
}
if (!process.argv.includes("--confirm=RESUME_MARKET_AFTER_VALIDATION")) {
  throw new Error("Resume requires --confirm=RESUME_MARKET_AFTER_VALIDATION");
}

async function main() {
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await supabase.rpc("resume_market_after_reset", {
  p_confirmation: "RESUME_MARKET_AFTER_VALIDATION",
});
if (error) throw error;
console.log("Market trading and price engine resumed after zero-discrepancy validation.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
