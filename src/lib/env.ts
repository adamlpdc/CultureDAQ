export type AppEnvironment = "development" | "staging" | "production";

/**
 * Canonical app URL for the current environment.
 * Set explicitly in Vercel; falls back to VERCEL_URL or localhost.
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3002";
}

export function getAppEnvironment(): AppEnvironment {
  const explicit = process.env.NEXT_PUBLIC_APP_ENV;
  if (explicit === "production" || explicit === "staging" || explicit === "development") {
    return explicit;
  }
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "staging";
  return "development";
}

export function isProductionApp(): boolean {
  return getAppEnvironment() === "production";
}

/** Server-side gate for the isolated Culture Intelligence sandbox. */
export function isCultureIntelligenceEnabled(): boolean {
  return process.env.FEATURE_CULTURE_INTELLIGENCE === "true";
}

export function isCultureIntelligenceV1Enabled(): boolean {
  return process.env.FEATURE_CULTURE_INTELLIGENCE_V1 !== "false";
}

/** AI discovery only creates suggestions; it never verifies events or touches prices. */
export function isCultureIntelligenceV2Enabled(): boolean {
  return process.env.FEATURE_CULTURE_INTELLIGENCE_V2 === "true";
}

/** One-time administrative gate for the market redenomination workflow. */
export function isMarketRebalanceEnabled(): boolean {
  return process.env.FEATURE_MARKET_REBALANCE === "true";
}

/** Market Engine v2 is active by default; set false for emergency legacy rollback. */
export function isMarketEngineV2Enabled(): boolean {
  return process.env.MARKET_ENGINE_V2_ENABLED !== "false";
}

/** Reserved for public profile routes: /player/[slug] */
export function getPublicProfilePath(username: string): string {
  return `/player/${username.toLowerCase()}`;
}
