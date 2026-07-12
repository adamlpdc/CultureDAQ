import { createAdminClient } from "@/lib/supabase/admin";
import { duplicateKey, estimatedPriceImpact, filterQualityArticles, groupSimilarArticles, OpenAiDiscoveryProvider, storySimilarity, type AiDiscoveryProvider } from "./discovery";
import type { CultureEventAsset } from "./types";
import type { DiscoveryArticle, DiscoveryMonitoring, SuggestedCultureEvent } from "./discovery-types";

function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
}

function xmlValue(item: string, names: string[]): string {
  for (const name of names) {
    const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decodeXml(match[1]);
  }
  return "";
}

export function parseApprovedFeed(xml: string, source: { id: string; name: string }): DiscoveryArticle[] {
  const items = xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  return items.slice(0, 40).flatMap((item) => {
    const title = xmlValue(item, ["title"]);
    const summary = xmlValue(item, ["description", "summary", "content"]);
    const href = item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ?? xmlValue(item, ["link", "guid"]);
    const publishedAt = xmlValue(item, ["pubDate", "published", "updated"]);
    if (!title || !href) return [];
    return [{ sourceId: source.id, sourceName: source.name, title, summary, url: href, publishedAt: new Date(publishedAt || Date.now()).toISOString() }];
  });
}

export class CultureDiscoveryService {
  constructor(private readonly provider: AiDiscoveryProvider) {}

  async run(tickKey: string) {
    const db = createAdminClient();
    const { data: claimed, error: claimError } = await db.from("culture_discovery_runs")
      .insert({ tick_key: tickKey }).select("id").single();
    if (claimError) {
      if (claimError.code === "23505") return { duplicateRun: true, suggestionsCreated: 0 };
      throw claimError;
    }
    const errors: string[] = [];
    try {
      const [{ data: sources, error: sourcesError }, { data: assetRows, error: assetsError }] = await Promise.all([
        db.from("culture_discovery_sources").select("id,name,feed_url").eq("enabled", true),
        db.from("assets").select("id,slug,name"),
      ]);
      if (sourcesError) throw sourcesError;
      if (assetsError) throw assetsError;
      const articles: DiscoveryArticle[] = [];
      for (const source of sources ?? []) {
        try {
          const response = await fetch(source.feed_url, { headers: { "User-Agent": "CultureDAQ-CultureDiscovery/2.0" }, signal: AbortSignal.timeout(10_000) });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          articles.push(...parseApprovedFeed(await response.text(), { id: source.id, name: source.name }));
        } catch (error) { errors.push(`${source.name}: ${error instanceof Error ? error.message : "feed error"}`); }
      }
      const quality = filterQualityArticles(articles);
      const groups = groupSimilarArticles(quality);
      const assets: CultureEventAsset[] = (assetRows ?? []).map((asset) => ({ assetId: asset.id, slug: asset.slug, name: asset.name }));
      let created = 0, duplicates = 0;
      for (const group of groups) {
        const candidate = await this.provider.discover(group, assets);
        if (!candidate) continue;
        const key = duplicateKey(candidate.title, candidate.affectedAssets);
        const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
        const { data: recent } = await db.from("culture_event_suggestions").select("id,title,affected_assets")
          .gte("created_at", since).in("status", ["pending", "approved"]);
        const duplicate = (recent ?? []).find((row) => row.title && storySimilarity(row.title, candidate.title) >= 0.7) ??
          (recent ?? []).find((row) => row.id && row.title && key === duplicateKey(row.title, row.affected_assets ?? []));
        if (duplicate) { duplicates++; continue; }
        const prediction = { ...candidate, duplicateKey: key, estimatedPriceImpactPercent: estimatedPriceImpact(candidate) };
        const { data: suggestion, error } = await db.from("culture_event_suggestions").insert({
          discovery_run_id: claimed.id, title: candidate.title, summary: candidate.summary, event_type: candidate.eventType,
          affected_assets: candidate.affectedAssets, confidence: candidate.confidence, sentiment: candidate.sentiment,
          expected_attention: candidate.expectedAttention, predicted_attention: candidate.predictedAttention, reach: candidate.reach,
          time_to_peak_hours: candidate.timeToPeakHours, decay_rate: candidate.decayRate, reasoning: candidate.reasoning,
          source_links: candidate.sourceLinks, duplicate_key: key, estimated_price_impact_percent: prediction.estimatedPriceImpactPercent,
          ai_model: process.env.OPENAI_DISCOVERY_MODEL ?? "gpt-5-mini", ai_prediction: prediction,
        }).select("id").single();
        if (error) throw error;
        await db.from("culture_suggestion_audit_log").insert({ suggestion_id: suggestion.id, action: "ai_suggested", actor_type: "ai", after_state: prediction });
        created++;
      }
      await db.from("culture_discovery_runs").update({ status: "completed", articles_seen: articles.length, quality_filtered: articles.length - quality.length, duplicate_count: duplicates, suggestions_created: created, errors, completed_at: new Date().toISOString() }).eq("id", claimed.id);
      return { duplicateRun: false, suggestionsCreated: created, duplicates, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown discovery error");
      await db.from("culture_discovery_runs").update({ status: "failed", errors, completed_at: new Date().toISOString() }).eq("id", claimed.id);
      throw error;
    }
  }
}

export function createDiscoveryService() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new CultureDiscoveryService(new OpenAiDiscoveryProvider(key));
}

export function suggestionFromRow(row: Record<string, unknown>): SuggestedCultureEvent {
  return { id: String(row.id), title: String(row.title), summary: String(row.summary), eventType: row.event_type as SuggestedCultureEvent["eventType"],
    affectedAssets: row.affected_assets as SuggestedCultureEvent["affectedAssets"], confidence: Number(row.confidence), sentiment: row.sentiment as SuggestedCultureEvent["sentiment"],
    expectedAttention: Number(row.expected_attention), predictedAttention: Number(row.predicted_attention), reach: Number(row.reach), timeToPeakHours: Number(row.time_to_peak_hours), decayRate: Number(row.decay_rate),
    reasoning: String(row.reasoning), sourceLinks: row.source_links as SuggestedCultureEvent["sourceLinks"], status: row.status as SuggestedCultureEvent["status"], duplicateKey: String(row.duplicate_key),
    estimatedPriceImpactPercent: Number(row.estimated_price_impact_percent), mergedIntoId: row.merged_into_id ? String(row.merged_into_id) : null,
    approvedCultureEventId: row.approved_culture_event_id ? String(row.approved_culture_event_id) : null, createdAt: String(row.created_at), reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null };
}

export function calculateDiscoveryMonitoring(rows: Array<Record<string, unknown>>, duplicateCount: number, articlesSeen: number): DiscoveryMonitoring {
  const reviewed = rows.filter((row) => row.status !== "pending");
  const predictions = rows.filter((row) => row.predicted_attention != null && row.final_outcome && typeof row.final_outcome === "object")
    .map((row) => Math.abs(Number(row.predicted_attention) - Number((row.final_outcome as Record<string, unknown>).actual_attention)));
  return { suggestionsToday: rows.length, approvalRate: reviewed.length ? reviewed.filter((row) => row.status === "approved").length / reviewed.length : 0,
    rejectionRate: reviewed.length ? reviewed.filter((row) => row.status === "rejected").length / reviewed.length : 0,
    averageConfidence: rows.length ? rows.reduce((sum, row) => sum + Number(row.confidence), 0) / rows.length : 0,
    averagePredictionAccuracy: predictions.length ? 1 - predictions.reduce((sum, value) => sum + value, 0) / (predictions.length * 4) : null,
    duplicateDetectionRate: articlesSeen ? duplicateCount / articlesSeen : 0 };
}
