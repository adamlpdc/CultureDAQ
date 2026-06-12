import type { ImageCandidate } from "../types";

export function clearbitLogoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}`;
}

export async function verifyClearbitLogo(domain: string): Promise<boolean> {
  const url = clearbitLogoUrl(domain);
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok && (res.headers.get("content-type")?.includes("image") ?? false);
  } catch {
    return false;
  }
}

export async function matchClearbitBrand(
  domain: string,
  brandName: string
): Promise<ImageCandidate | null> {
  const ok = await verifyClearbitLogo(domain);
  if (!ok) return null;
  return {
    title: brandName,
    imageUrl: clearbitLogoUrl(domain),
    confidence: 0.95,
    source: "clearbit",
    externalId: domain,
  };
}
