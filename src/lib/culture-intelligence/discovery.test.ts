import assert from "node:assert/strict";
import test from "node:test";
import { duplicateKey, estimatedPriceImpact, filterQualityArticles, groupSimilarArticles, storySimilarity } from "./discovery";
import { calculateDiscoveryMonitoring, parseApprovedFeed } from "./discovery-service";

const asset = (slug: string) => ({ slug, name: slug.toUpperCase() });

test("duplicate detection groups similar reports and keeps unrelated stories separate", () => {
  const articles = [
    { sourceId: "1", sourceName: "A", title: "Artist wins major award in London", summary: "A confirmed awards result with details.", url: "https://a.test/1", publishedAt: new Date().toISOString() },
    { sourceId: "2", sourceName: "B", title: "London major award won by artist", summary: "A second confirmed report with details.", url: "https://b.test/2", publishedAt: new Date().toISOString() },
    { sourceId: "1", sourceName: "A", title: "Football club signs new partnership", summary: "A confirmed commercial partnership report.", url: "https://a.test/3", publishedAt: new Date().toISOString() },
  ];
  assert.ok(storySimilarity(articles[0].title, articles[1].title) >= 0.55);
  assert.equal(groupSimilarArticles(articles).length, 2);
  assert.equal(duplicateKey("Same event", [asset("b"), asset("a")]), duplicateKey("Same event", [asset("a"), asset("b")]));
});

test("multi-asset prediction preserves all affected assets", () => {
  const assets = [asset("alpha"), asset("beta")];
  assert.notEqual(duplicateKey("Joint release", assets), duplicateKey("Joint release", [assets[0]]));
});

test("conflicting news has neutral direction until an admin reviews it", () => {
  assert.equal(estimatedPriceImpact({ confidence: 80, sentiment: "mixed", expectedAttention: 4, predictedAttention: 4, reach: 5 }), 0);
});

test("low-quality feed entries are filtered", () => {
  assert.equal(filterQualityArticles([{ sourceId: "1", sourceName: "Spam", title: "Win now", summary: "click", url: "http://spam.test", publishedAt: new Date().toISOString() }]).length, 0);
});

test("approved RSS parser accepts only concrete feed records", () => {
  const rows = parseApprovedFeed("<rss><channel><item><title>Confirmed culture announcement</title><description>Enough factual summary for review.</description><link>https://source.test/story</link><pubDate>2026-07-12T10:00:00Z</pubDate></item></channel></rss>", { id: "source", name: "Approved" });
  assert.equal(rows.length, 1); assert.equal(rows[0].sourceName, "Approved");
});

test("monitoring reports approval, rejection, confidence, accuracy and duplicates", () => {
  const result = calculateDiscoveryMonitoring([
    { status: "approved", confidence: 80, predicted_attention: 4, final_outcome: { actual_attention: 3 } },
    { status: "rejected", confidence: 60 },
  ], 2, 10);
  assert.equal(result.approvalRate, 0.5); assert.equal(result.rejectionRate, 0.5);
  assert.equal(result.averageConfidence, 70); assert.equal(result.averagePredictionAccuracy, 0.75); assert.equal(result.duplicateDetectionRate, 0.2);
});

test("approval safety is encoded as an unverified draft in the migration", async () => {
  const migration = await import("node:fs/promises").then((fs) => fs.readFile("supabase/culture-intelligence-v2.sql", "utf8"));
  assert.match(migration, /false, 'draft', p_actor/);
  assert.doesNotMatch(migration, /is_verified[^\n]*true/);
  assert.match(migration, /culture_suggestion_audit_log/);
});
