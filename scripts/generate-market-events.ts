import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { getAssetRankMovementsMap } from "../src/lib/asset-ranking";
import { generateAssetEvents } from "../src/lib/market-events";
import type { Asset } from "../src/types/database";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: assets } = await supabase.from("assets").select("*");
  const rankMovements = await getAssetRankMovementsMap(
    supabase,
    (assets ?? []) as Asset[]
  );
  const result = await generateAssetEvents(supabase, {
    assets: (assets ?? []) as Asset[],
    rankMovements,
  });

  console.log("Generated:", result.generated, "Skipped:", result.skipped);

  const { data: samples } = await supabase
    .from("market_events")
    .select("headline, event_type, impact_score, is_positive, assets(name)")
    .order("created_at", { ascending: false })
    .limit(12);

  for (const row of samples ?? []) {
    const asset = row.assets as unknown as { name: string } | null;
    const sign = row.is_positive ? "+" : "-";
    console.log(
      `- ${asset?.name}: ${row.headline} (${row.event_type}, impact ${sign}${row.impact_score})`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
