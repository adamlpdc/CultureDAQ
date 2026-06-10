/**
 * Generates a large JSON seed file for bulk asset import.
 * Usage: npx tsx scripts/generate-bulk-assets.ts > data/bulk-assets.json
 * Then: npm run seed -- data/bulk-assets.json
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { AssetCategory, SeedAsset } from "../src/types/database";

const CATEGORIES: AssetCategory[] = [
  "actors",
  "musicians",
  "athletes",
  "influencers",
  "tv_personalities",
  "brands",
  "movies",
  "tv_shows",
  "sports_teams",
];

const PREFIXES: Record<AssetCategory, string[]> = {
  actors: ["Star", "Rising", "Legend", "Icon", "Screen"],
  musicians: ["Beat", "Sound", "Rhythm", "Melody", "Vibe"],
  athletes: ["Pro", "Elite", "Champion", "Ace", "Turbo"],
  influencers: ["Viral", "Trend", "Creator", "Digital", "Social"],
  tv_personalities: ["Host", "Star", "Show", "Prime", "Live"],
  brands: ["Global", "Prime", "Ultra", "Next", "Core"],
  movies: ["Epic", "Saga", "Block", "Cine", "Reel"],
  tv_shows: ["Series", "Stream", "Episode", "Binge", "Watch"],
  sports_teams: ["FC", "United", "City", "Athletic", "Club"],
};

const TARGET = 800;
const existing: SeedAsset[] = JSON.parse(
  readFileSync(resolve(process.cwd(), "data/seed-assets.json"), "utf-8")
);

const generated: SeedAsset[] = [...existing];
const slugs = new Set(existing.map((a) => a.slug));

let counter = 1;
while (generated.length < TARGET) {
  const category = CATEGORIES[counter % CATEGORIES.length];
  const prefix = PREFIXES[category][counter % PREFIXES[category].length];
  const name = `${prefix} Asset ${counter}`;
  const slug = `generated-${category}-${counter}`;

  if (!slugs.has(slug)) {
    generated.push({
      slug,
      name,
      category,
      description: `Generated cultural asset #${counter} for market simulation.`,
      current_price: Math.round((50 + Math.random() * 450) * 100) / 100,
      volatility_score: Math.round((0.8 + Math.random() * 0.8) * 10) / 10,
    });
    slugs.add(slug);
  }
  counter++;
}

const outPath = resolve(process.cwd(), "data/bulk-assets.json");
writeFileSync(outPath, JSON.stringify(generated, null, 2));
console.log(`Generated ${generated.length} assets to ${outPath}`);
