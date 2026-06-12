/**
 * Apply verified portrait enrichment from dry-run report.
 * Updates image_url only.
 *
 * Usage: npx tsx scripts/enrich-portraits-apply.ts [report-path]
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { PERSON_CATEGORIES } from "../src/lib/asset-visual";
import {
  PORTRAIT_CATEGORIES,
  type PortraitDryRunReport,
  type PortraitEnrichmentResult,
} from "../src/lib/image-enrichment/portrait-types";
import { extensionForContentType } from "../src/lib/image-enrichment/brand-sources";
import {
  ensureAssetImagesBucket,
  uploadAssetImage,
} from "../src/lib/image-enrichment/storage";
import { verifyImageUrl } from "../src/lib/image-enrichment/verify";

const EXCLUDED_SLUGS = new Set(["austin-butler", "drake"]);
const DOWNLOAD_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 CultureDAQ/1.0";

async function downloadPortrait(sourceUrl: string): Promise<{ body: ArrayBuffer; contentType: string | null }> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent": DOWNLOAD_UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://en.wikipedia.org/",
      },
      redirect: "follow",
    });
    if (res.status === 429) {
      lastError = new Error(`Download failed (429): ${sourceUrl}`);
      continue;
    }
    if (!res.ok) {
      throw new Error(`Download failed (${res.status}): ${sourceUrl}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      throw new Error(`Non-image content from ${sourceUrl}`);
    }
    return { body: await res.arrayBuffer(), contentType };
  }
  throw lastError ?? new Error(`Download failed: ${sourceUrl}`);
}

async function resolveHostedPortraitUrl(
  supabase: ReturnType<typeof createClient>,
  slug: string,
  sourceUrl: string
): Promise<string> {
  const host = new URL(sourceUrl).hostname;
  if (!host.includes("wikimedia.org")) {
    return sourceUrl;
  }

  await new Promise((r) => setTimeout(r, 2500));
  const { body, contentType } = await downloadPortrait(sourceUrl);
  const ext = extensionForContentType(contentType, sourceUrl);
  const storagePath = `portraits/${slug}.${ext}`;
  const publicUrl = await uploadAssetImage(
    supabase,
    storagePath,
    body,
    contentType ?? `image/${ext === "jpg" ? "jpeg" : ext}`
  );

  const verified = await verifyImageUrl(publicUrl);
  if (!verified.ok) {
    throw new Error(`Hosted portrait failed verification: ${publicUrl}`);
  }

  return publicUrl;
}

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

interface CoverageSnapshot {
  totalAssetsWithImage: number;
  personAssetsWithImage: number;
  portraitCategoryWithImage: number;
  brokenCount: number;
}

async function auditBrokenCount(
  supabase: ReturnType<typeof createClient>,
  rows: { image_url: string | null }[]
): Promise<number> {
  let broken = 0;
  for (const row of rows) {
    if (!row.image_url) continue;
    const check = await verifyImageUrl(row.image_url);
    if (!check.ok) broken++;
    await new Promise((r) => setTimeout(r, 80));
  }
  return broken;
}

async function buildSnapshot(
  supabase: ReturnType<typeof createClient>
): Promise<{ snapshot: CoverageSnapshot; rows: { id: string; slug: string; category: string; image_url: string | null }[] }> {
  const { data, error } = await supabase
    .from("assets")
    .select("id, slug, category, image_url");

  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const snapshot: CoverageSnapshot = {
    totalAssetsWithImage: rows.filter((r) => r.image_url).length,
    personAssetsWithImage: rows.filter(
      (r) => PERSON_CATEGORIES.includes(r.category as (typeof PERSON_CATEGORIES)[number]) && r.image_url
    ).length,
    portraitCategoryWithImage: rows.filter(
      (r) =>
        PORTRAIT_CATEGORIES.includes(r.category as (typeof PORTRAIT_CATEGORIES)[number]) &&
        r.image_url
    ).length,
    brokenCount: await auditBrokenCount(supabase, rows),
  };

  return { snapshot, rows };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
  }

  const reportPath =
    process.argv[2] ?? resolve(process.cwd(), "reports/portrait-enrichment-dry-run.json");
  if (!existsSync(reportPath)) {
    console.error(`Report not found: ${reportPath}`);
    process.exit(1);
  }

  const dryRun = JSON.parse(readFileSync(reportPath, "utf-8")) as PortraitDryRunReport;
  const supabase = createClient(supabaseUrl, serviceKey);
  await ensureAssetImagesBucket(supabase);

  console.log("Measuring before state...");
  const { snapshot: before } = await buildSnapshot(supabase);

  const skipped: PortraitEnrichmentResult[] = [];
  const updated: {
    assetId: string;
    slug: string;
    name: string;
    category: string;
    previousImageUrl: string | null;
    newImageUrl: string;
    source: string;
    confidence: number;
  }[] = [];
  const errors: { slug: string; name: string; error: string }[] = [];

  for (const result of dryRun.results) {
    if (EXCLUDED_SLUGS.has(result.slug)) {
      skipped.push(result);
      continue;
    }

    if (!result.verified || !result.proposedImageUrl) {
      skipped.push(result);
      continue;
    }

    if (result.manualReview) {
      skipped.push(result);
      continue;
    }

    let imageUrl: string;
    try {
      imageUrl = await resolveHostedPortraitUrl(supabase, result.slug, result.proposedImageUrl);
      await new Promise((r) => setTimeout(r, imageUrl.includes("wikimedia.org") ? 0 : 200));
    } catch (e) {
      errors.push({
        slug: result.slug,
        name: result.name,
        error: e instanceof Error ? e.message : String(e),
      });
      continue;
    }

    const verified = await verifyImageUrl(imageUrl);
    if (!verified.ok) {
      errors.push({
        slug: result.slug,
        name: result.name,
        error: `URL failed live verification: ${verified.error ?? verified.status}`,
      });
      continue;
    }

    const { data: existing } = await supabase
      .from("assets")
      .select("image_url")
      .eq("id", result.assetId)
      .single();

    if (existing?.image_url === imageUrl) {
      continue;
    }

    const { error } = await supabase
      .from("assets")
      .update({ image_url: imageUrl })
      .eq("id", result.assetId);

    if (error) {
      errors.push({ slug: result.slug, name: result.name, error: error.message });
      continue;
    }

    updated.push({
      assetId: result.assetId,
      slug: result.slug,
      name: result.name,
      category: result.category,
      previousImageUrl: existing?.image_url ?? null,
      newImageUrl: imageUrl,
      source: result.source ?? "unknown",
      confidence: result.confidence ?? 0,
    });
  }

  console.log("Measuring after state...");
  const { snapshot: after } = await buildSnapshot(supabase);

  const applyReport = {
    generatedAt: new Date().toISOString(),
    sourceReport: reportPath,
    excludedSlugs: [...EXCLUDED_SLUGS],
    before,
    after,
    summary: {
      applied: updated.length,
      skipped: skipped.length,
      errors: errors.length,
    },
    updated,
    skipped: skipped.map((s) => ({
      slug: s.slug,
      name: s.name,
      category: s.category,
      reason: EXCLUDED_SLUGS.has(s.slug)
        ? "excluded_pending_manual_confirmation"
        : s.manualReview
          ? s.reviewReason
          : "not_verified",
      proposedImageUrl: s.proposedImageUrl,
    })),
    errors,
  };

  const outPath = resolve(process.cwd(), "reports/portrait-enrichment-apply.json");
  mkdirSync(resolve(process.cwd(), "reports"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(applyReport, null, 2));

  console.log("\n=== Portrait apply summary ===");
  console.log(`Applied:  ${updated.length}`);
  console.log(`Skipped:  ${skipped.length}`);
  console.log(`Errors:   ${errors.length}`);
  console.log("\n--- Before / After ---");
  console.log(`Total assets with image_url:     ${before.totalAssetsWithImage} → ${after.totalAssetsWithImage}`);
  console.log(`Person assets with image_url:    ${before.personAssetsWithImage} → ${after.personAssetsWithImage}`);
  console.log(`Portrait targets with image_url: ${before.portraitCategoryWithImage} → ${after.portraitCategoryWithImage}`);
  console.log(`Broken images:                   ${before.brokenCount} → ${after.brokenCount}`);
  console.log(`Report: ${outPath}`);

  if (skipped.length) {
    console.log("\n--- Skipped / manual review ---");
    for (const s of applyReport.skipped) {
      console.log(`  [${s.category}] ${s.name} — ${s.reason}`);
    }
  }

  if (errors.length) {
    console.error("\n--- Errors ---");
    for (const e of errors) {
      console.error(`  ${e.name}: ${e.error}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
