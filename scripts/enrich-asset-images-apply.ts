/**
 * Apply verified image enrichment for non-person assets.
 * Updates image_url only — preserves IDs, prices, rankings, and all relations.
 *
 * Usage: npx tsx scripts/enrich-asset-images-apply.ts
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY (optional)
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { runDryRunEnrichment } from "../src/lib/image-enrichment/enrich";
import {
  ENRICHABLE_CATEGORIES,
  type ApplyReport,
  type EnrichableCategory,
  type ImageCoverageStats,
} from "../src/lib/image-enrichment/types";
import { verifyImageUrl } from "../src/lib/image-enrichment/verify";

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

function buildCoverageStats(
  rows: { category: string; image_url: string | null }[]
): ImageCoverageStats {
  const byCategory = Object.fromEntries(
    ENRICHABLE_CATEGORIES.map((c) => [c, { total: 0, withImage: 0, withoutImage: 0 }])
  ) as ImageCoverageStats["byCategory"];

  let withImage = 0;
  for (const row of rows) {
    const cat = row.category as EnrichableCategory;
    if (!ENRICHABLE_CATEGORIES.includes(cat)) continue;
    const bucket = byCategory[cat];
    bucket.total++;
    if (row.image_url) {
      bucket.withImage++;
      withImage++;
    } else {
      bucket.withoutImage++;
    }
  }

  const total = rows.length;
  return {
    total,
    withImage,
    withoutImage: total - withImage,
    coveragePercent: total ? Math.round((withImage / total) * 1000) / 10 : 0,
    byCategory,
  };
}

async function fetchEnrichableAssets() {
  const { data, error } = await supabase
    .from("assets")
    .select("id, slug, name, category, image_url")
    .in("category", [...ENRICHABLE_CATEGORIES])
    .order("category")
    .order("name");

  if (error) throw new Error(`Failed to load assets: ${error.message}`);
  return data ?? [];
}

async function main() {
  const assets = await fetchEnrichableAssets();
  console.log(`Loaded ${assets.length} non-person assets`);

  const before = buildCoverageStats(assets);
  console.log(
    `Before: ${before.withImage}/${before.total} with image_url (${before.coveragePercent}%)`
  );

  if (!tmdbKey) {
    console.warn("TMDB_API_KEY not set — movies/TV will rely on overrides only");
  }

  const enrichment = await runDryRunEnrichment(
    assets.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category as EnrichableCategory,
    })),
    tmdbKey
  );

  const imageUrlById = new Map(assets.map((a) => [a.id, a.image_url]));
  const report: ApplyReport = {
    generatedAt: new Date().toISOString(),
    dryRun: false,
    before,
    after: before,
    summary: {
      enriched: 0,
      skippedManualReview: 0,
      skippedUnmatched: 0,
      skippedUnverified: 0,
      skippedUnchanged: 0,
      errors: 0,
    },
    updated: [],
    manualReview: [],
    errors: [],
  };

  for (const result of enrichment.results) {
    if (result.manualReview) {
      report.summary.skippedManualReview++;
      report.manualReview.push(result);
      continue;
    }

    if (!result.proposedImageUrl) {
      report.summary.skippedUnmatched++;
      report.manualReview.push(result);
      continue;
    }

    const verified = await verifyImageUrl(result.proposedImageUrl);
    if (!verified.ok) {
      report.summary.skippedUnverified++;
      report.manualReview.push({
        ...result,
        manualReview: true,
        reviewReason: `unverified_url (${verified.error ?? verified.status})`,
      });
      continue;
    }

    const previousImageUrl = imageUrlById.get(result.assetId) ?? null;
    if (previousImageUrl === result.proposedImageUrl) {
      report.summary.skippedUnchanged++;
      continue;
    }

    const { error } = await supabase
      .from("assets")
      .update({ image_url: result.proposedImageUrl })
      .eq("id", result.assetId);

    if (error) {
      report.summary.errors++;
      report.errors.push({
        assetId: result.assetId,
        slug: result.slug,
        name: result.name,
        error: error.message,
      });
      continue;
    }

    report.summary.enriched++;
    report.updated.push({
      assetId: result.assetId,
      slug: result.slug,
      name: result.name,
      category: result.category,
      previousImageUrl,
      newImageUrl: result.proposedImageUrl,
      source: result.source ?? result.candidates[0]?.source ?? "override",
      confidence: result.confidence ?? 0,
      matchLabel: result.matchLabel,
    });
  }

  const afterAssets = await fetchEnrichableAssets();
  report.after = buildCoverageStats(afterAssets);

  const outDir = resolve(process.cwd(), "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "image-enrichment-apply.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("\n=== Apply summary ===");
  console.log(`Updated:              ${report.summary.enriched}`);
  console.log(`Skipped (unchanged):  ${report.summary.skippedUnchanged}`);
  console.log(`Skipped (unverified): ${report.summary.skippedUnverified}`);
  console.log(`Skipped (review):     ${report.summary.skippedManualReview}`);
  console.log(`Skipped (unmatched):  ${report.summary.skippedUnmatched}`);
  console.log(`Errors:               ${report.summary.errors}`);
  console.log(
    `After:  ${report.after.withImage}/${report.after.total} with image_url (${report.after.coveragePercent}%)`
  );
  console.log(`Report: ${outPath}`);

  if (report.manualReview.length) {
    console.log("\n=== Manual review (not applied) ===");
    for (const r of report.manualReview) {
      console.log(
        `  [${r.category}] ${r.name} — ${r.reviewReason ?? "no match"} (conf: ${r.confidence ?? "n/a"})`
      );
    }
  }

  if (report.errors.length) {
    console.error("\n=== Errors ===");
    for (const e of report.errors) {
      console.error(`  ${e.name}: ${e.error}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
