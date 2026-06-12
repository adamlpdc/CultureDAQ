/** Verified live download URLs for brand logos (Clearbit replacement). */
export const BRAND_LOGO_SOURCES: Record<string, string> = {
  nike: "https://cdn.simpleicons.org/nike/111111",
  apple: "https://cdn.simpleicons.org/apple/000000",
  tesla: "https://cdn.simpleicons.org/tesla/CC0000",
  spotify: "https://cdn.simpleicons.org/spotify/1DB954",
  netflix: "https://cdn.simpleicons.org/netflix/E50914",
  google: "https://cdn.simpleicons.org/google/4285F4",
  adidas: "https://cdn.simpleicons.org/adidas/000000",
  amazon:
    "https://1000logos.net/wp-content/uploads/2016/10/Amazon-Logo.png",
  disney:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/1280px-Disney%2B_logo.svg.png",
  "prime-hydration":
    "https://drinkprime.com/cdn/shop/files/PRIME_Social_Sharing_Image_1200x.png?v=1734715820",
};

export function extensionForContentType(contentType: string | null, fallbackUrl: string): string {
  if (contentType?.includes("svg")) return "svg";
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  if (contentType?.includes("webp")) return "webp";
  if (fallbackUrl.endsWith(".svg")) return "svg";
  if (fallbackUrl.endsWith(".png")) return "png";
  if (fallbackUrl.endsWith(".jpg") || fallbackUrl.endsWith(".jpeg")) return "jpg";
  return "png";
}
