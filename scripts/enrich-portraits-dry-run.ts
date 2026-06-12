/**
 * Dry-run portrait enrichment for person assets (read-only).
 * Does NOT write to the database.
 *
 * Usage: npx tsx scripts/enrich-portraits-dry-run.ts
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY (optional)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { runPortraitDryRun } from "../src/lib/image-enrichment/portrait-enrich";
import { PORTRAIT_CATEGORIES, type PortraitCategory } from "../src/lib/image-enrichment/portrait-types";

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
    .in("category", [...PORTRAIT_CATEGORIES])
    .order("category")
    .order("name");

  if (error) {
    console.error("Failed to load assets:", error.message);
    process.exit(1);
  }

  console.log(`Loaded ${data?.length ?? 0} portrait-category assets (read-only)`);
  if (!tmdbKey) {
    console.warn("TMDB_API_KEY not set — TMDB person search will use page scraping");
  }

  const report = await runPortraitDryRun(
    (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category as PortraitCategory,
    })),
    tmdbKey
  );

  const outDir = resolve(process.cwd(), "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "portrait-enrichment-dry-run.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("\n=== Portrait dry-run summary ===");
  console.log(`Verified URLs:  ${report.summary.verified}/${report.summary.total}`);
  console.log(`Manual review:  ${report.summary.manualReview}`);
  console.log(`Unverified:     ${report.summary.unverified}`);
  console.log(`Report:         ${outPath}`);

  console.log("\n=== Results (verified URLs only in image_url column) ===");
  for (const r of report.results) {
    const conf = r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "n/a";
    console.log(
      `[${r.category}] ${r.name} | ${r.source ?? "—"} | ${conf} | review=${r.manualReview ? "yes" : "no"}`
    );
    if (r.proposedImageUrl) {
      console.log(`  ${r.proposedImageUrl}`);
    } else {
      console.log(`  (no verified URL — ${r.reviewReason ?? "unmatched"})`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
