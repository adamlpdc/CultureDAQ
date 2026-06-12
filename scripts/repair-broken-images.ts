/**
 * Repair broken non-person image_url values (read URLs from DB, verify, fix, write back).
 * Updates image_url only. Writes reports/image-repair.json.
 *
 * Usage: npx tsx scripts/repair-broken-images.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { BRAND_LOGO_SOURCES, extensionForContentType } from "../src/lib/image-enrichment/brand-sources";
import { resolveVerifiedTmdbPoster } from "../src/lib/image-enrichment/refresh-poster";
import {
  ensureAssetImagesBucket,
  uploadAssetImage,
} from "../src/lib/image-enrichment/storage";
import { ENRICHABLE_CATEGORIES, type EnrichableCategory } from "../src/lib/image-enrichment/types";
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

type OverrideEntry = Record<string, unknown>;
type OverridesFile = Record<string, OverrideEntry>;

interface RepairRow {
  name: string;
  slug: string;
  category: string;
  previousImageUrl: string | null;
  newImageUrl: string | null;
  action: "fixed" | "already_working" | "failed";
  cause?: string;
  httpStatus?: number | null;
}

async function downloadBytes(url: string): Promise<{ body: ArrayBuffer; contentType: string | null }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 CultureDAQ-repair/1.0" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }
  return {
    body: await res.arrayBuffer(),
    contentType: res.headers.get("content-type"),
  };
}

async function repairBrandLogo(
  slug: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ publicUrl: string; storagePath: string }> {
  const sourceUrl = BRAND_LOGO_SOURCES[slug];
  if (!sourceUrl) {
    throw new Error(`No brand source URL configured for ${slug}`);
  }

  const verified = await verifyImageUrl(sourceUrl);
  if (!verified.ok) {
    throw new Error(`Brand source not verified: ${sourceUrl} (${verified.error})`);
  }

  const { body, contentType } = await downloadBytes(sourceUrl);
  const ext = extensionForContentType(contentType, sourceUrl);
  const storagePath = `brands/${slug}.${ext}`;
  const publicUrl = await uploadAssetImage(
    supabase,
    storagePath,
    body,
    contentType ?? `image/${ext === "svg" ? "svg+xml" : ext}`
  );

  const hosted = await verifyImageUrl(publicUrl);
  if (!hosted.ok) {
    throw new Error(`Hosted brand URL failed verification: ${publicUrl}`);
  }

  return { publicUrl, storagePath };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tmdbKey = process.env.TMDB_API_KEY ?? null;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const overridesPath = resolve(process.cwd(), "data/asset-image-overrides.json");
  const overrides = JSON.parse(readFileSync(overridesPath, "utf-8")) as OverridesFile;

  const { data: assets, error } = await supabase
    .from("assets")
    .select("id, slug, name, category, image_url")
    .in("category", [...ENRICHABLE_CATEGORIES])
    .order("category")
    .order("name");

  if (error) throw new Error(error.message);

  await ensureAssetImagesBucket(supabase);

  const rows: RepairRow[] = [];
  let beforeWorking = 0;
  let beforeBroken = 0;

  for (const asset of assets ?? []) {
    const currentUrl = asset.image_url as string | null;
    let verified = currentUrl ? await verifyImageUrl(currentUrl) : { ok: false, status: null };

    if (verified.ok) {
      beforeWorking++;
      rows.push({
        name: asset.name,
        slug: asset.slug,
        category: asset.category,
        previousImageUrl: currentUrl,
        newImageUrl: currentUrl,
        action: "already_working",
        httpStatus: verified.status,
      });
      continue;
    }

    beforeBroken++;
    let newUrl: string | null = null;
    let failure: string | undefined;

    try {
      if (asset.category === "brands") {
        const hosted = await repairBrandLogo(asset.slug, supabase);
        newUrl = hosted.publicUrl;
        overrides[asset.slug] = {
          provider: "supabase",
          storage_path: hosted.storagePath,
          source_url: BRAND_LOGO_SOURCES[asset.slug],
          image_url: hosted.publicUrl,
        };
      } else if (asset.category === "movies" || asset.category === "tv_shows") {
        const entry = overrides[asset.slug];
        if (
          entry &&
          (entry.provider === "tmdb_movie" ||
            entry.provider === "tmdb_tv" ||
            entry.provider === "tmdb_collection")
        ) {
          const resolved = await resolveVerifiedTmdbPoster(
            entry as {
              provider: "tmdb_movie" | "tmdb_tv" | "tmdb_collection";
              external_id: string;
              poster_path?: string;
              label?: string;
            },
            tmdbKey
          );
          if (!resolved) {
            throw new Error("Could not resolve verified TMDB poster");
          }
          newUrl = resolved.imageUrl;
          overrides[asset.slug] = {
            ...entry,
            poster_path: resolved.posterPath,
            image_url: resolved.imageUrl,
          };
        } else {
          throw new Error("No TMDB override entry for asset");
        }
      } else {
        throw new Error("Unexpected broken non-brand/non-tmdb asset");
      }

      const recheck = await verifyImageUrl(newUrl);
      if (!recheck.ok) {
        throw new Error(`Repaired URL failed verification: ${recheck.error}`);
      }

      const { error: updateError } = await supabase
        .from("assets")
        .update({ image_url: newUrl })
        .eq("id", asset.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      rows.push({
        name: asset.name,
        slug: asset.slug,
        category: asset.category,
        previousImageUrl: currentUrl,
        newImageUrl: newUrl,
        action: "fixed",
        httpStatus: recheck.status,
      });
    } catch (e) {
      failure = e instanceof Error ? e.message : String(e);
      rows.push({
        name: asset.name,
        slug: asset.slug,
        category: asset.category,
        previousImageUrl: currentUrl,
        newImageUrl: null,
        action: "failed",
        cause: failure,
        httpStatus: verified.status,
      });
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);

  const afterAudit = [];
  let afterWorking = 0;
  let afterBroken = 0;

  for (const asset of assets ?? []) {
    const row = rows.find((r) => r.slug === asset.slug);
    const url =
      row?.action === "fixed" ? row.newImageUrl : (asset.image_url as string | null);
    const check = url ? await verifyImageUrl(url) : { ok: false, status: null };
    if (check.ok) afterWorking++;
    else afterBroken++;
    afterAudit.push({
      name: asset.name,
      slug: asset.slug,
      image_url: url,
      loads: check.ok,
      httpStatus: check.status,
    });
    await new Promise((r) => setTimeout(r, 80));
  }

  const fixed = rows.filter((r) => r.action === "fixed");
  const failed = rows.filter((r) => r.action === "failed");

  const report = {
    generatedAt: new Date().toISOString(),
    before: {
      totalWithImageUrl: assets?.filter((a) => a.image_url).length ?? 0,
      working: beforeWorking,
      broken: beforeBroken,
    },
    after: {
      totalWithImageUrl: assets?.length ?? 0,
      working: afterWorking,
      broken: afterBroken,
    },
    fixed,
    failed,
    remainingFailures: afterAudit.filter((a) => !a.loads),
    all: rows,
  };

  const outPath = resolve(process.cwd(), "reports/image-repair.json");
  mkdirSync(resolve(process.cwd(), "reports"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("\n=== Image repair summary ===");
  console.log(`Before: ${beforeWorking} working, ${beforeBroken} broken`);
  console.log(`Fixed:  ${fixed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`After:  ${afterWorking} working, ${afterBroken} broken`);
  console.log(`Report: ${outPath}`);

  if (failed.length) {
    for (const f of failed) {
      console.error(`  [${f.category}] ${f.name}: ${f.cause}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
