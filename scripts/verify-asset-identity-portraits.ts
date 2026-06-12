/**
 * Verifies AssetIdentity render-mode routing for person portraits and other categories.
 * Run: npx tsx scripts/verify-asset-identity-portraits.ts
 */
import {
  PERSON_CATEGORIES,
  POSTER_CATEGORIES,
  LOGO_CATEGORIES,
  resolveAssetIdentityRenderMode,
} from "../src/lib/asset-visual";
import type { AssetCategory } from "../src/types/database";

const TEST_IMAGE = "https://example.com/image.jpg";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

console.log("Person categories with image_url → portrait-image");
for (const category of PERSON_CATEGORIES) {
  const mode = resolveAssetIdentityRenderMode(category, TEST_IMAGE);
  assert(mode === "portrait-image", `${category} → portrait-image (got ${mode})`);
}

console.log("\nPerson categories without image_url → portrait-fallback");
for (const category of PERSON_CATEGORIES) {
  const mode = resolveAssetIdentityRenderMode(category, null);
  assert(mode === "portrait-fallback", `${category} → portrait-fallback (got ${mode})`);
}

console.log("\nMovies & TV with image_url → poster-image");
for (const category of POSTER_CATEGORIES) {
  const mode = resolveAssetIdentityRenderMode(category, TEST_IMAGE);
  assert(mode === "poster-image", `${category} → poster-image (got ${mode})`);
}

console.log("\nMovies & TV without image_url → poster-fallback");
for (const category of POSTER_CATEGORIES) {
  const mode = resolveAssetIdentityRenderMode(category, null);
  assert(mode === "poster-fallback", `${category} → poster-fallback (got ${mode})`);
}

console.log("\nBrands & sports teams with image_url → logo-image");
for (const category of LOGO_CATEGORIES) {
  const mode = resolveAssetIdentityRenderMode(category, TEST_IMAGE);
  assert(mode === "logo-image", `${category} → logo-image (got ${mode})`);
}

console.log("\nBrands & sports teams without image_url → logo-fallback");
for (const category of LOGO_CATEGORIES) {
  const mode = resolveAssetIdentityRenderMode(category, null);
  assert(mode === "logo-fallback", `${category} → logo-fallback (got ${mode})`);
}

console.log("\nPoster takes priority over person if mis-categorized (edge case)");
const edge: AssetCategory = "movies";
assert(
  resolveAssetIdentityRenderMode(edge, TEST_IMAGE) === "poster-image",
  "movies never routes to portrait"
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
