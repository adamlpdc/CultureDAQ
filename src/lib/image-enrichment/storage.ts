import type { SupabaseClient } from "@supabase/supabase-js";

export const ASSET_IMAGES_BUCKET = "asset-images";

export function assetImagePublicUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${ASSET_IMAGES_BUCKET}/${storagePath}`;
}

export async function ensureAssetImagesBucket(supabase: SupabaseClient): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === ASSET_IMAGES_BUCKET);
  if (exists) return;

  const { error } = await supabase.storage.createBucket(ASSET_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  });
  if (error && !error.message.includes("already exists")) {
    throw new Error(`Failed to create bucket: ${error.message}`);
  }
}

export async function uploadAssetImage(
  supabase: SupabaseClient,
  storagePath: string,
  body: ArrayBuffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage.from(ASSET_IMAGES_BUCKET).upload(storagePath, body, {
    contentType,
    upsert: true,
    cacheControl: "31536000",
  });

  if (error) {
    throw new Error(`Upload failed for ${storagePath}: ${error.message}`);
  }

  const { data } = supabase.storage.from(ASSET_IMAGES_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
