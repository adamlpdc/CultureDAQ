import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import type { AssetCategory, SeedAsset } from "../src/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

function parseCsv(content: string): SeedAsset[] {
  const lines = content.trim().split("\n");
  const header = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });

    return {
      slug: row.slug,
      name: row.name,
      category: row.category as AssetCategory,
      description: row.description || undefined,
      image_url: row.image_url || undefined,
      current_price: row.current_price ? parseFloat(row.current_price) : undefined,
      volatility_score: row.volatility_score
        ? parseFloat(row.volatility_score)
        : undefined,
      category_weight: row.category_weight
        ? parseFloat(row.category_weight)
        : undefined,
      featured: row.featured === "true",
    };
  });
}

function loadAssets(): SeedAsset[] {
  const csvPath = resolve(process.cwd(), "data/seed-assets.csv");
  const jsonPath = resolve(process.cwd(), "data/seed-assets.json");

  const sourceFile = process.argv[2];

  if (sourceFile) {
    const content = readFileSync(resolve(process.cwd(), sourceFile), "utf-8");
    return sourceFile.endsWith(".csv") ? parseCsv(content) : JSON.parse(content);
  }

  if (existsSync(csvPath)) {
    return parseCsv(readFileSync(csvPath, "utf-8"));
  }

  return JSON.parse(readFileSync(jsonPath, "utf-8"));
}

async function seed() {
  const assets = loadAssets();
  console.log(`Seeding ${assets.length} assets...`);

  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);

    const rows = batch.map((asset) => ({
      slug: asset.slug,
      name: asset.name,
      category: asset.category,
      description: asset.description ?? null,
      image_url: asset.image_url ?? null,
      current_price: asset.current_price ?? 100,
      previous_price: asset.current_price ?? 100,
      volatility_score: asset.volatility_score ?? 1.0,
      category_weight: asset.category_weight ?? 1.0,
      featured: asset.featured ?? false,
      trading_paused: false,
      buy_pressure: 0,
      sell_pressure: 0,
      momentum_score: 0,
      trade_volume_24h: Math.floor(Math.random() * 200),
    }));

    const { data, error } = await supabase
      .from("assets")
      .upsert(rows, { onConflict: "slug" })
      .select("id, slug, current_price");

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
      continue;
    }

    if (data) {
      const priceRows = data.map((a) => ({
        asset_id: a.id,
        price: a.current_price,
      }));
      await supabase.from("asset_prices").insert(priceRows);
      inserted += data.length;
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${data.length} assets`);
    }
  }

  const { count } = await supabase
    .from("assets")
    .select("*", { count: "exact", head: true });

  console.log(`\nDone. Processed: ${inserted} assets`);
  console.log(`Total assets in database: ${count}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
