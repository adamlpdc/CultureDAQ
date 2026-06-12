/**
 * Read-only audit of asset image_url values — HTTP probe + optional Next optimizer check.
 * Usage: npx tsx scripts/audit-broken-images.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

interface AuditRow {
  name: string;
  slug: string;
  category: string;
  image_url: string;
  hostname: string | null;
  httpStatus: number | null;
  contentType: string | null;
  error: string | null;
  nextImageStatus: number | null;
  cause: string;
  loads: boolean;
}

function hostnameAllowed(imageUrl: string): boolean {
  try {
    const u = new URL(imageUrl);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** SVG is served unoptimized by next/image; optimizer 400 is expected. */
function isSvgImage(imageUrl: string, contentType: string | null): boolean {
  const path = imageUrl.split("?", 1)[0].toLowerCase();
  if (path.endsWith(".svg")) return true;
  const ct = contentType?.toLowerCase() ?? "";
  return ct.includes("image/svg");
}

function classifySvgCause(
  imageUrl: string,
  status: number | null,
  err: string | null,
  contentType: string | null
): string {
  const base = classifyCause(imageUrl, status, err, contentType);
  if (base !== "ok") return base;

  const ct = contentType?.toLowerCase() ?? "";
  if (!ct.startsWith("image/")) {
    return "svg_invalid_content_type";
  }

  return "ok";
}

function classifyCause(
  imageUrl: string,
  status: number | null,
  err: string | null,
  contentType: string | null
): string {
  const host = (() => {
    try {
      return new URL(imageUrl).hostname;
    } catch {
      return "";
    }
  })();

  if (!imageUrl || !imageUrl.startsWith("http")) return "invalid_url";
  if (!hostnameAllowed(imageUrl)) return "remote_domain_not_allowed";

  if (err) {
    if (host.includes("clearbit.com")) return "clearbit_unavailable_or_blocked";
    return "network_error";
  }

  if (status === 404) {
    if (host.includes("clearbit.com")) return "clearbit_logo_not_found";
    return "remote_404";
  }

  if (status === 403 || status === 401) {
    if (host.includes("clearbit.com")) return "clearbit_blocked_or_forbidden";
    return "remote_forbidden";
  }

  if (status && status >= 400) {
    if (host.includes("clearbit.com")) return "clearbit_http_error";
    return "remote_http_error";
  }

  if (status && status >= 200 && status < 300) {
    if (contentType && !contentType.startsWith("image/")) {
      return "non_image_content_type";
    }
    return "ok";
  }

  return "unknown";
}

async function probe(imageUrl: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    let res = await fetch(imageUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "CultureDAQ-image-audit/1.0" },
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(imageUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "CultureDAQ-image-audit/1.0" },
      });
    }
    return {
      status: res.status,
      contentType: res.headers.get("content-type"),
      error: null as string | null,
    };
  } catch (e) {
    return {
      status: null,
      contentType: null,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function probeNextOptimizer(imageUrl: string) {
  const encoded = encodeURIComponent(imageUrl);
  const optimizerUrl = `http://localhost:3002/_next/image?url=${encoded}&w=96&q=75`;
  try {
    const res = await fetch(optimizerUrl, { redirect: "follow" });
    return { status: res.status, ok: res.ok };
  } catch (e) {
    return {
      status: null,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env vars");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("assets")
    .select("slug, name, category, image_url")
    .not("image_url", "is", null)
    .order("category")
    .order("name");

  if (error) throw new Error(error.message);

  const results: AuditRow[] = [];

  for (const asset of data ?? []) {
    const imageUrl = asset.image_url as string;
    const probeResult = await probe(imageUrl);
    let cause = classifyCause(
      imageUrl,
      probeResult.status,
      probeResult.error,
      probeResult.contentType
    );

    let nextImageStatus: number | null = null;
    const svg = isSvgImage(imageUrl, probeResult.contentType);

    if (svg) {
      cause = classifySvgCause(
        imageUrl,
        probeResult.status,
        probeResult.error,
        probeResult.contentType
      );
      // Next.js serves .svg via unoptimized passthrough; skip optimizer probe.
    } else if (cause === "ok") {
      const next = await probeNextOptimizer(imageUrl);
      nextImageStatus = next.status;
      if (!next.ok) {
        cause = "next_image_optimizer_failed";
      }
    }

    results.push({
      name: asset.name,
      slug: asset.slug,
      category: asset.category,
      image_url: imageUrl,
      hostname: (() => {
        try {
          return new URL(imageUrl).hostname;
        } catch {
          return null;
        }
      })(),
      httpStatus: probeResult.status,
      contentType: probeResult.contentType,
      error: probeResult.error,
      nextImageStatus,
      cause,
      loads: cause === "ok",
    });

    await new Promise((r) => setTimeout(r, 120));
  }

  const broken = results.filter((r) => !r.loads);
  const byHostname = Object.fromEntries(
    [...new Set(results.map((r) => r.hostname).filter(Boolean))].map((host) => [
      host,
      {
        total: results.filter((r) => r.hostname === host).length,
        broken: broken.filter((r) => r.hostname === host).length,
      },
    ])
  );

  const report = {
    generatedAt: new Date().toISOString(),
    totalWithImageUrl: results.length,
    brokenCount: broken.length,
    byHostname,
    broken,
    all: results,
  };

  const outPath = resolve(process.cwd(), "reports/broken-image-audit.json");
  mkdirSync(resolve(process.cwd(), "reports"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Total with image_url: ${report.totalWithImageUrl}`);
  console.log(`Broken: ${report.brokenCount}`);
  console.log(`Report: ${outPath}`);
  for (const b of broken) {
    console.log(`  [${b.category}] ${b.name} — HTTP ${b.httpStatus ?? "n/a"} — ${b.cause}`);
    console.log(`    ${b.image_url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
