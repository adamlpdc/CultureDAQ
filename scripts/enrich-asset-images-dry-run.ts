/**
 * Dry-run image enrichment for non-person assets (read-only).
 * Does NOT write to the database.
 *
 * Usage: npx tsx scripts/enrich-asset-images-dry-run.ts
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY (optional)
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { runDryRunEnrichment } from "../src/lib/image-enrichment/enrich";
import type { EnrichableCategory } from "../src/lib/image-enrichment/types";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tmdbKey = process.env.TMDB_API_KEY ?? null;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from("assets")
    .select("id, slug, name, category")
    .in("category", ["movies", "tv_shows", "brands", "sports_teams"])
    .order("category")
    .order("name");

  if (error) {
    console.error("Failed to load assets:", error.message);
    process.exit(1);
  }

  console.log(`Loaded ${data?.length ?? 0} non-person assets (read-only)`);
  if (!tmdbKey) {
    console.warn("TMDB_API_KEY not set — movies/TV will rely on overrides only");
  }

  const report = await runDryRunEnrichment(
    (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category as EnrichableCategory,
    })),
    tmdbKey
  );

  const outDir = resolve(process.cwd(), "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "image-enrichment-dry-run.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("\n=== Dry-run summary ===");
  console.log(`Matched:        ${report.summary.matched}/${report.summary.total}`);
  console.log(`Manual review:  ${report.summary.manualReview}`);
  console.log(`Unmatched:      ${report.summary.unmatched}`);
  console.log(`Report:         ${outPath}`);

  const review = report.results.filter((r) => r.manualReview);
  if (review.length) {
    console.log("\n=== Manual review ===");
    for (const r of review) {
      console.log(
        `  [${r.category}] ${r.name} — ${r.reviewReason ?? "review"} (conf: ${r.confidence ?? "n/a"})`
      );
    }
  }

  const unmatched = report.results.filter((r) => !r.proposedImageUrl);
  if (unmatched.length) {
    console.log("\n=== Unmatched ===");
    for (const r of unmatched) {
      console.log(`  [${r.category}] ${r.name}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
