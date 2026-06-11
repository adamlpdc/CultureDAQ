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

/** Reserved for public profile routes: /player/[slug] */
export function getPublicProfilePath(username: string): string {
  return `/player/${username.toLowerCase()}`;
}
