export interface ImageVerifyResult {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  error: string | null;
}

/** Live HTTP check — image must return 2xx with an image/* content type. */
export async function verifyImageUrl(imageUrl: string): Promise<ImageVerifyResult> {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return { ok: false, status: null, contentType: null, error: "invalid_url" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    let res = await fetch(imageUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "CultureDAQ-image-verify/1.0" },
    });

    if (res.status === 405 || res.status === 501) {
      res = await fetch(imageUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "CultureDAQ-image-verify/1.0" },
      });
    }

    const contentType = res.headers.get("content-type");
    const isImage = contentType?.startsWith("image/") ?? false;
    const ok = res.ok && isImage;

    return {
      ok,
      status: res.status,
      contentType,
      error: ok ? null : isImage ? `http_${res.status}` : "non_image_content_type",
    };
  } catch (e) {
    return {
      ok: false,
      status: null,
      contentType: null,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}
