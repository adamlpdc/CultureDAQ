import { createHash } from "node:crypto";
import { z } from "zod";
import { CULTURE_EVENT_TYPES } from "./types";
import type { CultureEventAsset } from "./types";
import type { DiscoveryArticle, DiscoveryCandidate } from "./discovery-types";

const STOP_WORDS = new Set(["a", "an", "and", "at", "for", "from", "in", "of", "on", "the", "to", "with"]);

export function normalizeStory(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word)).sort().join(" ");
}

export function storySimilarity(a: string, b: string): number {
  const left = new Set(normalizeStory(a).split(" ").filter(Boolean));
  const right = new Set(normalizeStory(b).split(" ").filter(Boolean));
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((word) => right.has(word)).length;
  return overlap / (left.size + right.size - overlap);
}

export function duplicateKey(title: string, assets: CultureEventAsset[]): string {
  const normalized = `${normalizeStory(title)}|${assets.map((asset) => asset.slug).sort().join(",")}`;
  return createHash("sha256").update(normalized).digest("hex");
}

export function groupSimilarArticles(articles: DiscoveryArticle[], threshold = 0.55): DiscoveryArticle[][] {
  const groups: DiscoveryArticle[][] = [];
  for (const article of articles) {
    const group = groups.find((items) => items.some((item) => storySimilarity(item.title, article.title) >= threshold));
    if (group) group.push(article); else groups.push([article]);
  }
  return groups;
}

export function estimatedPriceImpact(candidate: Pick<DiscoveryCandidate, "confidence" | "sentiment" | "expectedAttention" | "predictedAttention" | "reach">): number {
  const direction = candidate.sentiment === "positive" ? 1 : candidate.sentiment === "negative" ? -1 : 0;
  const attention = (candidate.expectedAttention + candidate.predictedAttention) / 10;
  return Number((direction * (candidate.confidence / 100) * attention * (candidate.reach / 5) * 3).toFixed(3));
}

const candidateSchema = z.object({
  title: z.string().min(5).max(180), summary: z.string().min(10).max(1500),
  eventType: z.enum(CULTURE_EVENT_TYPES),
  affectedAssetSlugs: z.array(z.string()).min(1), confidence: z.number().min(0).max(100),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]),
  expectedAttention: z.number().min(1).max(5), predictedAttention: z.number().min(1).max(5),
  reach: z.number().min(1).max(5), timeToPeakHours: z.number().min(0).max(720),
  decayRate: z.number().min(0).max(1), reasoning: z.string().min(10).max(2000),
});

export interface AiDiscoveryProvider {
  discover(group: DiscoveryArticle[], assets: CultureEventAsset[]): Promise<DiscoveryCandidate | null>;
}

export class OpenAiDiscoveryProvider implements AiDiscoveryProvider {
  constructor(private readonly apiKey: string, private readonly model = process.env.OPENAI_DISCOVERY_MODEL ?? "gpt-5-mini") {}

  async discover(group: DiscoveryArticle[], assets: CultureEventAsset[]): Promise<DiscoveryCandidate | null> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        instructions: "You identify material culture events from approved-source reports. Ignore spam, rumours without evidence, clickbait, evergreen profiles and trivial stories. Never invent assets or URLs. Return null-worthy low quality as confidence 0.",
        input: JSON.stringify({ reports: group, approvedAssets: assets.map(({ slug, name }) => ({ slug, name })) }),
        text: { format: { type: "json_schema", name: "culture_event_suggestion", strict: true, schema: {
          type: "object", additionalProperties: false,
          properties: {
            title: { type: "string" }, summary: { type: "string" },
            eventType: { type: "string", enum: [...CULTURE_EVENT_TYPES] },
            affectedAssetSlugs: { type: "array", items: { type: "string" } },
            confidence: { type: "number" }, sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] },
            expectedAttention: { type: "number" }, predictedAttention: { type: "number" }, reach: { type: "number" },
            timeToPeakHours: { type: "number" }, decayRate: { type: "number" }, reasoning: { type: "string" }
          }, required: ["title", "summary", "eventType", "affectedAssetSlugs", "confidence", "sentiment", "expectedAttention", "predictedAttention", "reach", "timeToPeakHours", "decayRate", "reasoning"]
        } } },
      }),
    });
    if (!response.ok) throw new Error(`AI discovery request failed (${response.status})`);
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("AI discovery returned no structured output");
    const parsed = candidateSchema.parse(JSON.parse(text));
    if (parsed.confidence < Number(process.env.AI_DISCOVERY_MIN_CONFIDENCE ?? 45)) return null;
    const bySlug = new Map(assets.map((asset) => [asset.slug, asset]));
    const affectedAssets = parsed.affectedAssetSlugs.map((slug) => bySlug.get(slug)).filter((asset): asset is CultureEventAsset => Boolean(asset));
    if (!affectedAssets.length) return null;
    return { ...parsed, affectedAssets, sourceLinks: group.map(({ title, url, sourceName }) => ({ title, url, sourceName })) };
  }
}

export function filterQualityArticles(articles: DiscoveryArticle[]): DiscoveryArticle[] {
  return articles.filter((article) => article.title.trim().length >= 12 && article.summary.trim().length >= 20 && /^https:\/\//.test(article.url));
}
